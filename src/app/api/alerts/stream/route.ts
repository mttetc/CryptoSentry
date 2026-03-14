import type { NextRequest } from 'next/server';
import { requireAuthFromRequest, AuthError } from '@/lib/api/auth';
import { createServiceSupabaseClient } from '@/lib/supabase/server';
import { fetchPrices } from '@/lib/services/crypto/coingecko';
import { sendUnifiedAlert } from '@/actions/messaging/unified-notifications';
import type { AlertNotification } from '@/types/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PRICE_POLL_INTERVAL_MS = 30_000;
const HEARTBEAT_INTERVAL_MS = 30_000;
const RECURRING_COOLDOWN_MS = 5 * 60_000; // 5 min cooldown for recurring alerts
const EXACT_THRESHOLD = 0.005; // ±0.5% for "exact" direction

interface PriceAlertRow {
  id: string;
  user_id: string;
  symbol: string;
  coingecko_id: string;
  target_price: number;
  direction: 'above' | 'below' | 'exact';
  recurring: boolean;
  last_triggered_at: string | null;
}

async function fetchUserPriceAlerts(userId: string): Promise<PriceAlertRow[]> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('price_alerts')
    .select('id, user_id, symbol, coingecko_id, target_price, direction, recurring, last_triggered_at')
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

function shouldTriggerAlert(alert: PriceAlertRow, currentPrice: number): boolean {
  switch (alert.direction) {
    case 'above': {
      return currentPrice >= alert.target_price;
    }
    case 'below': {
      return currentPrice <= alert.target_price;
    }
    case 'exact': {
      const diff = Math.abs(currentPrice - alert.target_price) / alert.target_price;
      return diff <= EXACT_THRESHOLD;
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

/**
 * Fire trigger: for one-shot alerts, mark as triggered + inactive.
 * For recurring alerts, update last_triggered_at only.
 */
async function consumeTrigger(alert: PriceAlertRow, currentPrice: number): Promise<boolean> {
  const supabase = createServiceSupabaseClient();
  const now = new Date().toISOString();

  if (alert.recurring) {
    // Recurring: just update cooldown timestamp
    const { error } = await supabase
      .from('price_alerts')
      .update({ last_triggered_at: now })
      .eq('id', alert.id);

    if (error) {
      console.error('[SSE] Failed to update recurring alert:', error);
      return false;
    }
  } else {
    // One-shot: mark as triggered and deactivate
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

  // Persist trigger record
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

      async function pollPrices() {
        if (!alive) {
          return;
        }

        try {
          const alerts = await fetchUserPriceAlerts(userId);
          if (alerts.length === 0) {
            return;
          }

          const uniqueIds = [...new Set(alerts.map((a) => a.coingecko_id))];
          const prices = await fetchPrices(uniqueIds);

          if (Object.keys(prices).length === 0) {
            return;
          }

          // Send live prices to client
          send('price:update', { type: 'price:update', prices });

          // Check for triggers
          for (const alert of alerts) {
            const currentPrice = prices[alert.coingecko_id];
            if (currentPrice === undefined) {
              continue;
            }

            // Skip non-one-shot alerts that already triggered
            if (!alert.recurring && alert.last_triggered_at) {
              continue;
            }

            // Skip recurring alerts in cooldown
            if (isInCooldown(alert)) {
              continue;
            }

            if (shouldTriggerAlert(alert, currentPrice)) {
              const consumed = await consumeTrigger(alert, currentPrice);
              if (consumed) {
                send('price:triggered', {
                  type: 'price:triggered',
                  alertId: alert.id,
                  symbol: alert.symbol,
                  currentPrice,
                  targetPrice: alert.target_price,
                  direction: alert.direction,
                });
              }
            }
          }
        } catch (error) {
          console.error('[SSE] Poll error:', error);
        }
      }

      // Initial poll immediately
      pollPrices();

      // Then poll on interval
      const pollTimer = setInterval(() => {
        pollPrices();
      }, PRICE_POLL_INTERVAL_MS);

      // Heartbeat
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

      // Cleanup on abort
      request.signal.addEventListener('abort', () => {
        alive = false;
        clearInterval(pollTimer);
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
