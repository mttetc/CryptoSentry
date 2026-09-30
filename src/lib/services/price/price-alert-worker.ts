import { EventEmitter } from 'node:events';
import { createServiceSupabaseClient } from '@/lib/supabase/server';
import { createPriceStream, type RealtimePriceStream } from '@/lib/services/crypto';
import { sendUnifiedAlert } from '@/actions/messaging/unified-notifications';
import type { Database } from '@/types/database';

/**
 * Single server-side evaluator for every user's price alerts.
 *
 * Before this worker existed, alerts were only evaluated inside each open dashboard's SSE
 * connection: no browser tab, no alert; two tabs, two notifications. Now one Binance WebSocket
 * feeds one evaluation loop, and SSE connections merely subscribe to this emitter.
 */

const ALERT_REFRESH_INTERVAL_MS = 30_000;
const RECURRING_COOLDOWN_MS = 60_000;

type PriceAlertRow = Pick<
  Database['public']['Tables']['price_alerts']['Row'],
  | 'id'
  | 'user_id'
  | 'symbol'
  | 'binance_symbol'
  | 'target_price'
  | 'direction'
  | 'recurring'
  | 'triggered_at'
  | 'last_triggered_at'
>;

export interface PriceTick {
  symbol: string; // Binance symbol, uppercase (BTCUSDT)
  price: number;
}

export interface PriceTriggeredEvent {
  userId: string;
  alertId: string;
  symbol: string;
  binanceSymbol: string;
  currentPrice: number;
  targetPrice: number;
  direction: PriceAlertRow['direction'];
  triggeredAt: string;
}

// --- Pure functions ---

/**
 * Above/below fire on the crossing when we have a previous price. On the very first observation
 * (no previous price) a non-recurring alert fires if the condition already holds; a recurring one
 * waits for a real crossing so it never spams while the price sits beyond the target.
 */
export function shouldTriggerAlert(
  alert: Pick<PriceAlertRow, 'direction' | 'target_price' | 'recurring'>,
  currentPrice: number,
  previousPrice: number | null
): boolean {
  const target = alert.target_price;

  switch (alert.direction) {
    case 'above': {
      if (previousPrice === null) {
        return !alert.recurring && currentPrice >= target;
      }
      return previousPrice < target && currentPrice >= target;
    }
    case 'below': {
      if (previousPrice === null) {
        return !alert.recurring && currentPrice <= target;
      }
      return previousPrice > target && currentPrice <= target;
    }
    case 'exact': {
      if (previousPrice === null) {
        return false;
      }
      return (
        (previousPrice < target && currentPrice >= target) ||
        (previousPrice > target && currentPrice <= target)
      );
    }
    default: {
      return false;
    }
  }
}

function isInCooldown(alert: PriceAlertRow, now: number): boolean {
  if (!alert.recurring || !alert.last_triggered_at) {
    return false;
  }
  return now - new Date(alert.last_triggered_at).getTime() < RECURRING_COOLDOWN_MS;
}

function directionLabel(direction: PriceAlertRow['direction']): string {
  if (direction === 'exact') {
    return 'reached';
  }
  return direction === 'above' ? 'risen above' : 'fallen below';
}

// --- Worker ---

// eslint-disable-next-line unicorn/prefer-event-target -- Node EventEmitter has on/off/emit with payloads
export class PriceAlertWorker extends EventEmitter {
  private alerts: PriceAlertRow[] = [];
  private stream: RealtimePriceStream | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  private latest = new Map<string, number>();
  /** Per-symbol promise chain so trigger evaluation for one symbol never overlaps. */
  private chains = new Map<string, Promise<void>>();

  async start(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;

    this.stream = createPriceStream((prices) => this.onPrices(prices));
    await this.refreshAlerts();

    this.refreshTimer = setInterval(() => {
      this.refreshAlerts().catch((error) => {
        console.error('[PriceWorker] Refresh failed:', error);
      });
    }, ALERT_REFRESH_INTERVAL_MS);

    console.warn(`[PriceWorker] Started with ${this.alerts.length} active alerts`);
  }

  stop(): void {
    this.running = false;
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.stream?.close();
    this.stream = null;
    console.warn('[PriceWorker] Stopped');
  }

  /** Called on start, every 30s, and right after any price alert mutation. */
  async refreshAlerts(): Promise<void> {
    if (!this.running) {
      return;
    }
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('price_alerts')
      .select(
        'id, user_id, symbol, binance_symbol, target_price, direction, recurring, triggered_at, last_triggered_at'
      )
      .eq('is_active', true);

    if (error) {
      console.error('[PriceWorker] Failed to fetch alerts:', error);
      return;
    }

    this.alerts = data ?? [];
    const symbols = [...new Set(this.alerts.map((a) => a.binance_symbol.toUpperCase()))];

    if (symbols.length > 0 && this.stream) {
      this.stream.revive();
      this.stream.subscribe(symbols);
    }
  }

  getLatestPrices(binanceSymbols: Iterable<string>): Record<string, number> {
    const out: Record<string, number> = {};
    for (const symbol of binanceSymbols) {
      const price = this.latest.get(symbol.toUpperCase());
      if (price !== undefined) {
        out[symbol.toUpperCase()] = price;
      }
    }
    return out;
  }

  getUserSymbols(userId: string): string[] {
    return [
      ...new Set(
        this.alerts.filter((a) => a.user_id === userId).map((a) => a.binance_symbol.toUpperCase())
      ),
    ];
  }

  getStatus() {
    return { running: this.running, alerts: this.alerts.length, symbols: this.latest.size };
  }

  // --- internals ---

  private onPrices(prices: Record<string, number>): void {
    for (const [rawSymbol, price] of Object.entries(prices)) {
      const symbol = rawSymbol.toUpperCase();
      const previous = this.latest.get(symbol) ?? null;
      this.latest.set(symbol, price);
      this.emit('price', { symbol, price } satisfies PriceTick);

      const chain = this.chains.get(symbol) ?? Promise.resolve();
      const next = chain
        .then(() => this.evaluate(symbol, price, previous))
        .catch((error) => {
          console.error(`[PriceWorker] Evaluation failed for ${symbol}:`, error);
        });
      this.chains.set(symbol, next);
    }
  }

  private async evaluate(
    symbol: string,
    currentPrice: number,
    previousPrice: number | null
  ): Promise<void> {
    const now = Date.now();

    for (const alert of this.alerts) {
      if (alert.binance_symbol.toUpperCase() !== symbol) {
        continue;
      }
      if (!alert.recurring && alert.triggered_at) {
        continue;
      }
      if (isInCooldown(alert, now)) {
        continue;
      }
      if (!shouldTriggerAlert(alert, currentPrice, previousPrice)) {
        continue;
      }

      const triggeredAt = await this.consumeTrigger(alert, currentPrice);
      if (!triggeredAt) {
        continue;
      }

      // Update local state immediately so the next tick does not re-fire before the refresh.
      if (alert.recurring) {
        alert.last_triggered_at = triggeredAt;
      } else {
        alert.triggered_at = triggeredAt;
        alert.last_triggered_at = triggeredAt;
      }

      const event: PriceTriggeredEvent = {
        userId: alert.user_id,
        alertId: alert.id,
        symbol: alert.symbol,
        binanceSymbol: symbol,
        currentPrice,
        targetPrice: alert.target_price,
        direction: alert.direction,
        triggeredAt,
      };
      this.emit('triggered', event);
      this.notify(event).catch((error) => {
        console.error('[PriceWorker] Notification failed:', error);
      });
    }

    if (
      this.alerts.some(
        (a) => !a.recurring && a.triggered_at && a.binance_symbol.toUpperCase() === symbol
      )
    ) {
      this.alerts = this.alerts.filter((a) => a.recurring || !a.triggered_at);
    }
  }

  /**
   * Atomically mark the alert as triggered. Returns the timestamp on success, null if another
   * process (or a previous tick) already consumed it.
   */
  private async consumeTrigger(alert: PriceAlertRow, currentPrice: number): Promise<string | null> {
    const supabase = createServiceSupabaseClient();
    const now = new Date().toISOString();

    if (alert.recurring) {
      const cutoff = new Date(Date.now() - RECURRING_COOLDOWN_MS).toISOString();
      const { data, error } = await supabase
        .from('price_alerts')
        .update({ last_triggered_at: now })
        .eq('id', alert.id)
        .eq('is_active', true)
        .or(`last_triggered_at.is.null,last_triggered_at.lt.${cutoff}`)
        .select('id');

      if (error || !data || data.length === 0) {
        return null;
      }
    } else {
      const { data, error } = await supabase
        .from('price_alerts')
        .update({ triggered_at: now, is_active: false, last_triggered_at: now })
        .eq('id', alert.id)
        .eq('is_active', true)
        .is('triggered_at', null)
        .select('id');

      if (error || !data || data.length === 0) {
        return null;
      }
    }

    const { error: triggerError } = await supabase.from('alert_triggers').insert({
      price_alert_id: alert.id,
      user_id: alert.user_id,
      type: 'price',
      data: {
        symbol: alert.symbol,
        binance_symbol: alert.binance_symbol,
        price: currentPrice,
        target_price: alert.target_price,
        direction: alert.direction,
      },
      triggered_at: now,
    });
    if (triggerError) {
      console.error('[PriceWorker] Failed to persist trigger:', triggerError);
    }

    return now;
  }

  private async notify(event: PriceTriggeredEvent): Promise<void> {
    await sendUnifiedAlert({
      userId: event.userId,
      alertType: 'price',
      alertId: event.alertId,
      message: `${event.symbol.toUpperCase()} has ${directionLabel(event.direction)} your target of $${event.targetPrice}. Current price: $${event.currentPrice}`,
      data: {
        symbol: event.symbol,
        price: event.currentPrice,
        targetPrice: event.targetPrice,
        condition: `${event.direction} $${event.targetPrice}`,
      },
    });
  }
}

// Single instance per process, survives Next.js dev HMR module reloads.
const globalRef = globalThis as typeof globalThis & {
  __cryptosentryPriceWorker?: PriceAlertWorker;
};
export const priceAlertWorker: PriceAlertWorker =
  globalRef.__cryptosentryPriceWorker ??
  (globalRef.__cryptosentryPriceWorker = new PriceAlertWorker());
