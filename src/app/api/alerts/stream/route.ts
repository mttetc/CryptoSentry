import type { NextRequest } from 'next/server';
import { requireAuthFromRequest, AuthError } from '@/lib/api/auth';
import {
  priceAlertWorker,
  type PriceTick,
  type PriceTriggeredEvent,
} from '@/lib/services/price/price-alert-worker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEARTBEAT_INTERVAL_MS = 30_000;
const SYMBOL_REFRESH_INTERVAL_MS = 30_000;
const PRICE_THROTTLE_MS = 5000;

/**
 * Read-only SSE feed for the dashboard. Trigger evaluation happens in the shared
 * PriceAlertWorker; this route only relays `price:update` and the user's own `price:triggered`.
 */
export async function GET(request: NextRequest) {
  let userId: string;
  try {
    const auth = await requireAuthFromRequest(request);
    userId = auth.userId;
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
      let symbols = new Set(priceAlertWorker.getUserSymbols(userId));
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
        if (!pricesDirty || !alive || symbols.size === 0) {
          return;
        }
        pricesDirty = false;
        send('price:update', {
          type: 'price:update',
          prices: priceAlertWorker.getLatestPrices(symbols),
        });
      }

      const onPrice = (tick: PriceTick) => {
        if (symbols.has(tick.symbol)) {
          pricesDirty = true;
        }
      };

      const onTriggered = (event: PriceTriggeredEvent) => {
        if (event.userId !== userId) {
          return;
        }
        send('price:triggered', {
          type: 'price:triggered',
          alertId: event.alertId,
          symbol: event.symbol,
          currentPrice: event.currentPrice,
          targetPrice: event.targetPrice,
          direction: event.direction,
          triggeredAt: event.triggeredAt,
        });
        symbols = new Set(priceAlertWorker.getUserSymbols(userId));
      };

      priceAlertWorker.on('price', onPrice);
      priceAlertWorker.on('triggered', onTriggered);

      // Initial snapshot so the UI has prices right away
      pricesDirty = true;
      flushPrices();

      const flushInterval = setInterval(flushPrices, PRICE_THROTTLE_MS);
      const symbolRefresh = setInterval(() => {
        symbols = new Set(priceAlertWorker.getUserSymbols(userId));
      }, SYMBOL_REFRESH_INTERVAL_MS);
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
        priceAlertWorker.off('price', onPrice);
        priceAlertWorker.off('triggered', onTriggered);
        clearInterval(flushInterval);
        clearInterval(symbolRefresh);
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
