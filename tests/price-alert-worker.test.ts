import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server, waitFor, SUPABASE_REST, sleep } from './setup';

// Replace the Binance WebSocket with a controllable fake.
const fake = vi.hoisted(() => ({
  onPrice: null as ((prices: Record<string, number>) => void) | null,
  subscribed: [] as string[][],
}));

vi.mock('@/lib/services/crypto', () => ({
  createPriceStream: (cb: (prices: Record<string, number>) => void) => {
    fake.onPrice = cb;
    return {
      subscribe: (symbols: string[]) => {
        fake.subscribed.push(symbols);
      },
      close: () => {
        /* No-op in tests */
      },
      revive: () => {
        /* No-op in tests */
      },
    };
  },
  cryptoProvider: { searchCoins: async () => [], fetchPrices: async () => ({}) },
}));

import {
  PriceAlertWorker,
  shouldTriggerAlert,
  type PriceTriggeredEvent,
} from '@/lib/services/price/price-alert-worker';

function push(prices: Record<string, number>) {
  fake.onPrice?.(prices);
}

interface AlertRow {
  id: string;
  user_id: string;
  symbol: string;
  binance_symbol: string;
  target_price: number;
  direction: 'above' | 'below' | 'exact';
  recurring: boolean;
  triggered_at: string | null;
  last_triggered_at: string | null;
}

function mockSupabase(alerts: AlertRow[]) {
  const captured = {
    patches: [] as { url: URL; body: Record<string, unknown> }[],
    triggers: [] as Record<string, unknown>[],
    deliveryLogs: [] as Record<string, unknown>[],
  };

  server.use(
    http.get(`${SUPABASE_REST}/price_alerts`, () => HttpResponse.json(alerts)),
    http.patch(`${SUPABASE_REST}/price_alerts`, async ({ request }) => {
      const url = new URL(request.url);
      captured.patches.push({ url, body: (await request.json()) as Record<string, unknown> });
      const id = url.searchParams.get('id')?.replace('eq.', '');
      return HttpResponse.json([{ id }]);
    }),
    http.post(`${SUPABASE_REST}/alert_triggers`, async ({ request }) => {
      captured.triggers.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json([], { status: 201 });
    }),
    // Notification path: no channels configured, Telegram not connected -> logged, not sent
    http.get(`${SUPABASE_REST}/notification_channels`, () => HttpResponse.json([])),
    http.get(`${SUPABASE_REST}/user_telegram_settings`, () => HttpResponse.json([])),
    http.post(`${SUPABASE_REST}/alert_delivery_logs`, async ({ request }) => {
      captured.deliveryLogs.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json([], { status: 201 });
    })
  );

  return captured;
}

const baseAlert: AlertRow = {
  id: 'pa-1',
  user_id: 'user-1',
  symbol: 'BTC',
  binance_symbol: 'BTCUSDT',
  target_price: 100_000,
  direction: 'above',
  recurring: false,
  triggered_at: null,
  last_triggered_at: null,
};

describe('shouldTriggerAlert', () => {
  it('above/below: non-recurring fires on first observation if already met, recurring needs a crossing', () => {
    expect(
      shouldTriggerAlert({ direction: 'above', target_price: 100, recurring: false }, 105, null)
    ).toBe(true);
    expect(
      shouldTriggerAlert({ direction: 'above', target_price: 100, recurring: true }, 105, null)
    ).toBe(false);
    expect(
      shouldTriggerAlert({ direction: 'above', target_price: 100, recurring: true }, 105, 99)
    ).toBe(true);
    expect(
      shouldTriggerAlert({ direction: 'above', target_price: 100, recurring: true }, 106, 105)
    ).toBe(false);
    expect(
      shouldTriggerAlert({ direction: 'below', target_price: 100, recurring: true }, 95, 101)
    ).toBe(true);
    expect(
      shouldTriggerAlert({ direction: 'below', target_price: 100, recurring: true }, 94, 95)
    ).toBe(false);
  });

  it('exact fires on any crossing and never on the first observation', () => {
    expect(
      shouldTriggerAlert({ direction: 'exact', target_price: 100, recurring: true }, 100, null)
    ).toBe(false);
    expect(
      shouldTriggerAlert({ direction: 'exact', target_price: 100, recurring: true }, 101, 99)
    ).toBe(true);
    expect(
      shouldTriggerAlert({ direction: 'exact', target_price: 100, recurring: true }, 99, 101)
    ).toBe(true);
    expect(
      shouldTriggerAlert({ direction: 'exact', target_price: 100, recurring: true }, 102, 101)
    ).toBe(false);
  });
});

describe('PriceAlertWorker', () => {
  it('subscribes to the alert symbols and consumes a one-shot alert exactly once', async () => {
    const captured = mockSupabase([baseAlert]);
    const worker = new PriceAlertWorker();
    const events: PriceTriggeredEvent[] = [];
    worker.on('triggered', (e: PriceTriggeredEvent) => events.push(e));

    await worker.start();
    expect(fake.subscribed.at(-1)).toEqual(['BTCUSDT']);
    expect(worker.getUserSymbols('user-1')).toEqual(['BTCUSDT']);

    push({ BTCUSDT: 99_000 });
    push({ BTCUSDT: 100_500 });
    push({ BTCUSDT: 101_000 });
    await waitFor(() => captured.deliveryLogs.length === 1);
    worker.stop();

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      userId: 'user-1',
      alertId: 'pa-1',
      currentPrice: 100_500,
      direction: 'above',
    });

    // Atomic consume: PATCH guarded by is_active + triggered_at is null, alert deactivated
    expect(captured.patches).toHaveLength(1);
    expect(captured.patches[0].url.searchParams.get('is_active')).toBe('eq.true');
    expect(captured.patches[0].url.searchParams.get('triggered_at')).toBe('is.null');
    expect(captured.patches[0].body).toMatchObject({ is_active: false });

    // Trigger persisted through price_alert_id, never alert_id (FK to social_alerts)
    expect(captured.triggers[0]).toMatchObject({
      price_alert_id: 'pa-1',
      user_id: 'user-1',
      type: 'price',
    });
    expect(captured.triggers[0]).not.toHaveProperty('alert_id');
    expect(worker.getLatestPrices(['BTCUSDT'])).toEqual({ BTCUSDT: 101_000 });
  });

  it('recurring alerts fire on crossings only, not while the price stays beyond the target', async () => {
    const captured = mockSupabase([{ ...baseAlert, id: 'pa-2', recurring: true }]);
    const worker = new PriceAlertWorker();
    const events: PriceTriggeredEvent[] = [];
    worker.on('triggered', (e: PriceTriggeredEvent) => events.push(e));

    await worker.start();
    push({ BTCUSDT: 100_500 }); // First observation, already above: no fire for recurring
    push({ BTCUSDT: 100_800 });
    push({ BTCUSDT: 99_000 });
    push({ BTCUSDT: 100_100 }); // Crossing: fire
    push({ BTCUSDT: 100_900 }); // Still above: no fire
    await waitFor(() => captured.triggers.length === 1);
    await sleep(50);
    worker.stop();

    expect(events).toHaveLength(1);
    expect(events[0].currentPrice).toBe(100_100);
    expect(captured.patches[0].body).toEqual({ last_triggered_at: expect.any(String) });
    expect(captured.patches[0].url.searchParams.get('or')).toContain('last_triggered_at.is.null');
  });

  it('ignores alerts for other symbols', async () => {
    const captured = mockSupabase([baseAlert]);
    const worker = new PriceAlertWorker();

    await worker.start();
    push({ ETHUSDT: 999_999 });
    await sleep(30);
    worker.stop();

    expect(captured.patches).toHaveLength(0);
    expect(worker.getUserSymbols('someone-else')).toEqual([]);
  });
});
