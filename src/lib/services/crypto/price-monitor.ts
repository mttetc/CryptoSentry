import { createServiceSupabaseClient } from '@/lib/supabase/server';
import { fetchPrices } from './coingecko';
import { sendUnifiedAlert } from '@/actions/messaging/unified-notifications';
import { alertEventBus } from '@/lib/services/event-bus';
import type { AlertNotification } from '@/types/notifications';

const DEFAULT_POLL_INTERVAL_MS = 30_000;
const ALERT_REFRESH_INTERVAL = 10;

interface PriceAlertRow {
  id: string;
  user_id: string;
  symbol: string;
  coingecko_id: string;
  target_price: number;
  direction: 'above' | 'below';
  is_active: boolean;
  triggered_at: string | null;
}

function buildDirectionLabel(direction: 'above' | 'below'): string {
  return direction === 'above' ? 'risen above' : 'fallen below';
}

export class PriceMonitor {
  private alerts: PriceAlertRow[] = [];
  private isMonitoring = false;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollCount = 0;

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      return;
    }

    this.alerts = await this.fetchActiveAlerts();
    this.isMonitoring = true;
    this.pollCount = 0;

    this.schedulePoll(0);
    console.warn(`[PriceMonitor] Started with ${this.alerts.length} alerts`);
  }

  async stopMonitoring(): Promise<void> {
    this.isMonitoring = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    console.warn('[PriceMonitor] Stopped');
  }

  async refreshAlerts(): Promise<void> {
    this.alerts = await this.fetchActiveAlerts();
  }

  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      activeAlerts: this.alerts.length,
      pollCount: this.pollCount,
    };
  }

  private async fetchActiveAlerts(): Promise<PriceAlertRow[]> {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('price_alerts')
      .select('id, user_id, symbol, coingecko_id, target_price, direction, is_active, triggered_at')
      .eq('is_active', true)
      .is('triggered_at', null);

    if (error) {
      console.error('[PriceMonitor] Failed to fetch alerts:', error);
      return [];
    }

    return (data ?? []) as PriceAlertRow[];
  }

  private schedulePoll(delayMs: number): void {
    if (!this.isMonitoring) {
      return;
    }
    this.pollTimer = setTimeout(() => {
      this.pollPrices().catch(console.error);
    }, delayMs);
  }

  private async pollPrices(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    this.pollCount += 1;

    // Refresh alerts periodically
    if (this.pollCount % ALERT_REFRESH_INTERVAL === 0) {
      await this.refreshAlerts();
    }

    if (this.alerts.length === 0) {
      this.schedulePoll(DEFAULT_POLL_INTERVAL_MS);
      return;
    }

    // Group alerts by coingecko_id to deduplicate API calls
    const uniqueIds = [...new Set(this.alerts.map((a) => a.coingecko_id))];

    console.warn(`[PriceMonitor] Polling prices for ${uniqueIds.length} coins...`);

    const prices = await fetchPrices(uniqueIds);

    console.warn(`[PriceMonitor] Prices received:`, JSON.stringify(prices));

    if (Object.keys(prices).length === 0) {
      this.schedulePoll(DEFAULT_POLL_INTERVAL_MS);
      return;
    }

    // Emit price update event for SSE
    const uniqueUserIds = [...new Set(this.alerts.map((a) => a.user_id))];
    alertEventBus.emit({
      type: 'price:update',
      prices,
      userIds: uniqueUserIds,
    });

    for (const alert of this.alerts) {
      if (!this.isMonitoring) {
        return;
      }

      const currentPrice = prices[alert.coingecko_id];
      if (currentPrice === undefined) {
        console.warn(`[PriceMonitor] No price for ${alert.coingecko_id} (alert ${alert.id})`);
        continue;
      }

      const shouldTrigger =
        (alert.direction === 'above' && currentPrice >= alert.target_price) ||
        (alert.direction === 'below' && currentPrice <= alert.target_price);

      console.warn(
        `[PriceMonitor] Check: ${alert.symbol} ${alert.direction} $${alert.target_price} vs $${currentPrice} → ${shouldTrigger ? 'TRIGGER' : 'no'}`
      );

      if (shouldTrigger) {
        await this.triggerAlert(alert, currentPrice);
      }
    }

    this.schedulePoll(DEFAULT_POLL_INTERVAL_MS);
  }

  private async triggerAlert(alert: PriceAlertRow, currentPrice: number): Promise<void> {
    const supabase = createServiceSupabaseClient();

    try {
      // Race condition guard: only trigger if not already triggered
      const { data: updated, error: updateError } = await supabase
        .from('price_alerts')
        .update({ triggered_at: new Date().toISOString(), is_active: false })
        .eq('id', alert.id)
        .is('triggered_at', null)
        .select('id')
        .single();

      if (updateError || !updated) {
        // Already triggered by another process
        return;
      }

      // Persist trigger record
      const { error: triggerError } = await supabase.from('alert_triggers').insert({
        alert_id: alert.id,
        user_id: alert.user_id,
        type: 'price',
        data: {
          symbol: alert.symbol,
          price: currentPrice,
          target_price: alert.target_price,
          direction: alert.direction,
        },
      });

      if (triggerError) {
        console.error('[PriceMonitor] Failed to insert trigger:', triggerError);
      }

      // Send notification
      const directionLabel = buildDirectionLabel(alert.direction);
      const notification: AlertNotification = {
        userId: alert.user_id,
        alertType: 'price',
        alertId: alert.id,
        message: `${alert.symbol.toUpperCase()} has ${directionLabel} your target of $${alert.target_price}. Current price: $${currentPrice}`,
        data: {
          symbol: alert.symbol,
          price: currentPrice,
          targetPrice: alert.target_price,
          condition: `${alert.direction} $${alert.target_price}`,
        },
      };

      await sendUnifiedAlert(notification);

      // Emit trigger event for SSE
      alertEventBus.emit({
        type: 'price:triggered',
        userId: alert.user_id,
        alertId: alert.id,
        symbol: alert.symbol,
        currentPrice,
        targetPrice: alert.target_price,
        direction: alert.direction,
      });

      // Remove from local cache
      this.alerts = this.alerts.filter((a) => a.id !== alert.id);

      console.warn(
        `[PriceMonitor] Triggered alert ${alert.id}: ${alert.symbol} ${alert.direction} $${alert.target_price} (current: $${currentPrice})`
      );
    } catch (error) {
      console.error(`[PriceMonitor] Error triggering alert ${alert.id}:`, error);
    }
  }
}

// Use globalThis for HMR stability — singleton must survive hot reloads
const globalKey = Symbol.for('cryptosentry.priceMonitor');
const globalRecord = globalThis as unknown as Record<symbol, PriceMonitor>;
export const priceMonitor: PriceMonitor = globalRecord[globalKey] ?? new PriceMonitor();
globalRecord[globalKey] = priceMonitor;
