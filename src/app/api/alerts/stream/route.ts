import type { NextRequest } from 'next/server';
import { requireAuthFromRequest, AuthError } from '@/lib/api/auth';
import { createServiceSupabaseClient } from '@/lib/supabase/server';
import { createPriceStream } from '@/lib/services/crypto';
import { sendUnifiedAlert } from '@/actions/messaging/unified-notifications';
import type { AlertNotification } from '@/types/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEARTBEAT_INTERVAL_MS = 30_000;
const ALERT_REFRESH_INTERVAL_MS = 30_000;
const RECURRING_COOLDOWN_MS = 30_000;
const PRICE_THROTTLE_MS = 5000;

interface PriceAlertRow {
  id: string;
  user_id: string;
  symbol: string;
  binance_symbol: string;
  target_price: number;
  direction: 'above' | 'below' | 'exact';
  recurring: boolean;
  last_triggered_at: string | null;
}

async function fetchUserPriceAlerts(userId: string): Promise<PriceAlertRow[]> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('price_alerts')
    .select(
      'id, user_id, symbol, binance_symbol, target_price, direction, recurring, last_triggered_at'
    )
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    console.error('[SSE] Failed to fetch price alerts:', error);
    return [];
  }
  return (data ?? []) as PriceAlertRow[];
}

function buildDirectionLabel(direction: string): string {
  if (direction === 'exact') {
    return 'reached';
  }
  return direction === 'above' ? 'risen above' : 'fallen below';
}

function shouldTriggerAlert(
  alert: PriceAlertRow,
  currentPrice: number,
  previousPrice: number | null
): boolean {
  switch (alert.direction) {
    case 'above': {
      return currentPrice >= alert.target_price;
    }
    case 'below': {
      return currentPrice <= alert.target_price;
    }
    case 'exact': {
      if (previousPrice === null) {
        return false;
      }
      const target = alert.target_price;
      const crossedUp = previousPrice < target && currentPrice >= target;
      const crossedDown = previousPrice > target && currentPrice <= target;
      return crossedUp || crossedDown;
    }
    default: {
      return false;
    }
  }
}

function isInCooldown(alert: PriceAlertRow): boolean {
  if (!alert.recurring || !alert.last_triggered_at) {
    return false;
  }
  const elapsed = Date.now() - new Date(alert.last_triggered_at).getTime();
  return elapsed < RECURRING_COOLDOWN_MS;
}

async function consumeTrigger(alert: PriceAlertRow, currentPrice: number): Promise<boolean> {
  const supabase = createServiceSupabaseClient();
  const now = new Date().toISOString();

  if (alert.recurring) {
    const { error } = await supabase
      .from('price_alerts')
      .update({ last_triggered_at: now })
      .eq('id', alert.id);

    if (error) {
      console.error('[SSE] Failed to update recurring alert:', error);
      return false;
    }
  } else {
    const { data: updated, error: updateError } = await supabase
      .from('price_alerts')
      .update({ triggered_at: now, is_active: false, last_triggered_at: now })
      .eq('id', alert.id)
      .is('triggered_at', null)
      .select('id')
      .single();

    if (updateError || !updated) {
      return false;
    }
  }

  await supabase.from('alert_triggers').insert({
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

  await sendUnifiedAlert(notification).catch((error) => {
    console.error('[SSE] Failed to send notification:', error);
  });

  return true;
}

export async function GET(request: NextRequest) {
  let userId: string;
  try {
    const result = await requireAuthFromRequest(request);
    userId = result.userId;
  } catch (error) {
    if (error instanceof AuthError) {
      return new Response('Unauthorized', { status: 401 });
    }
    return new Response('Internal Server Error', { status: 500 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let alive = true;

      // Price state
      const latestPrices = new Map<string, number>();
      const prevPrices = new Map<string, number>();
      let alerts: PriceAlertRow[] = [];
      let lastPricePush = 0;
      let pricesDirty = false;

      function send(event: string, data: unknown) {
        if (!alive) {
          return;
        }
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          alive = false;
        }
      }

      function flushPrices() {
        if (!pricesDirty || !alive) {
          return;
        }
        const now = Date.now();
        if (now - lastPricePush < PRICE_THROTTLE_MS) {
          return;
        }
        lastPricePush = now;
        pricesDirty = false;

        const prices: Record<string, number> = {};
        for (const [id, price] of latestPrices) {
          prices[id] = price;
        }
        send('price:update', { type: 'price:update', prices });
      }

      async function checkTriggers(binanceSymbol: string, currentPrice: number) {
        const previousPrice = prevPrices.get(binanceSymbol) ?? null;
        prevPrices.set(binanceSymbol, currentPrice);

        for (const alert of alerts) {
          if (alert.binance_symbol !== binanceSymbol) {
            continue;
          }
          if (!alert.recurring && alert.last_triggered_at) {
            continue;
          }
          if (isInCooldown(alert)) {
            continue;
          }

          if (shouldTriggerAlert(alert, currentPrice, previousPrice)) {
            const consumed = await consumeTrigger(alert, currentPrice);
            if (consumed) {
              send('price:triggered', {
                type: 'price:triggered',
                alertId: alert.id,
                symbol: alert.symbol,
                currentPrice,
                targetPrice: alert.target_price,
                direction: alert.direction,
                triggeredAt: new Date().toISOString(),
              });
              alerts = await fetchUserPriceAlerts(userId);
            }
          }
        }
      }

      const priceStream = createPriceStream((prices) => {
        for (const [binanceSymbol, price] of Object.entries(prices)) {
          latestPrices.set(binanceSymbol, price);
          pricesDirty = true;
          checkTriggers(binanceSymbol, price);
        }
        flushPrices();
      });

      async function refreshAlerts() {
        if (!alive) {
          return;
        }
        alerts = await fetchUserPriceAlerts(userId);

        const uniqueSymbols = [...new Set(alerts.map((a) => a.binance_symbol))];
        if (uniqueSymbols.length > 0) {
          priceStream.revive();
          priceStream.subscribe(uniqueSymbols);
        }
      }

      refreshAlerts();

      const alertRefresh = setInterval(() => {
        refreshAlerts();
      }, ALERT_REFRESH_INTERVAL_MS);

      const flushInterval = setInterval(() => {
        flushPrices();
      }, PRICE_THROTTLE_MS);

      const heartbeat = setInterval(() => {
        if (!alive) {
          return;
        }
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          alive = false;
        }
      }, HEARTBEAT_INTERVAL_MS);

      request.signal.addEventListener('abort', () => {
        alive = false;
        priceStream.close();
        clearInterval(alertRefresh);
        clearInterval(flushInterval);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
