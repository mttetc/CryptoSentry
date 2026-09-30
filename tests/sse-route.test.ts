import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const authMock = vi.hoisted(() => ({
  requireAuthFromRequest: vi.fn(),
}));

vi.mock('@/lib/api/auth', () => {
  class AuthError extends Error {
    constructor(message = 'Unauthorized') {
      super(message);
      this.name = 'AuthError';
    }
  }
  return { AuthError, requireAuthFromRequest: authMock.requireAuthFromRequest };
});

vi.mock('@/lib/services/price/price-alert-worker', async () => {
  const { EventEmitter } = await import('node:events');
  // eslint-disable-next-line unicorn/prefer-event-target -- mirrors the real worker's EventEmitter API
  const worker = Object.assign(new EventEmitter(), {
    getUserSymbols: (userId: string) => (userId === 'user-1' ? ['BTCUSDT'] : []),
    getLatestPrices: (symbols: Iterable<string>) => {
      const out: Record<string, number> = {};
      for (const s of symbols) {
        out[s] = 65_000;
      }
      return out;
    },
  });
  return { priceAlertWorker: worker };
});

import { GET as getStream } from '@/app/api/alerts/stream/route';
import { priceAlertWorker } from '@/lib/services/price/price-alert-worker';
import { AuthError } from '@/lib/api/auth';

interface Frame {
  event: string;
  data: Record<string, unknown>;
}

function parseFrames(chunk: string): Frame[] {
  return chunk
    .split('\n\n')
    .filter((block) => block.startsWith('event:'))
    .map((block) => {
      const [eventLine, dataLine] = block.split('\n');
      return {
        event: eventLine.replace('event: ', ''),
        data: JSON.parse(dataLine.replace('data: ', '')) as Record<string, unknown>,
      };
    });
}

async function readFrames(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<Frame[]> {
  const { value, done } = await reader.read();
  if (done || !value) {
    return [];
  }
  return parseFrames(new TextDecoder().decode(value));
}

describe('GET /api/alerts/stream', () => {
  it('returns 401 without a session', async () => {
    authMock.requireAuthFromRequest.mockRejectedValueOnce(new AuthError());
    const response = await getStream(new NextRequest('http://localhost/api/alerts/stream'));
    expect(response.status).toBe(401);
  });

  it('streams an initial price snapshot and only the user own triggers, then closes on abort', async () => {
    authMock.requireAuthFromRequest.mockResolvedValueOnce({ userId: 'user-1', supabase: null });
    const controller = new AbortController();
    const response = await getStream(
      new NextRequest('http://localhost/api/alerts/stream', { signal: controller.signal })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    if (!response.body) {
      throw new Error('no body');
    }
    const reader = response.body.getReader();

    const initial = await readFrames(reader);
    expect(initial).toEqual([
      { event: 'price:update', data: { type: 'price:update', prices: { BTCUSDT: 65_000 } } },
    ]);

    // Trigger for another user must not leak into this connection
    priceAlertWorker.emit('triggered', {
      userId: 'user-2',
      alertId: 'other',
      symbol: 'ETH',
      binanceSymbol: 'ETHUSDT',
      currentPrice: 1,
      targetPrice: 1,
      direction: 'above',
      triggeredAt: '2026-09-30T10:00:00.000Z',
    });
    priceAlertWorker.emit('triggered', {
      userId: 'user-1',
      alertId: 'pa-1',
      symbol: 'BTC',
      binanceSymbol: 'BTCUSDT',
      currentPrice: 100_500,
      targetPrice: 100_000,
      direction: 'exact',
      triggeredAt: '2026-09-30T10:00:01.000Z',
    });

    const next = await readFrames(reader);
    expect(next).toEqual([
      {
        event: 'price:triggered',
        data: {
          type: 'price:triggered',
          alertId: 'pa-1',
          symbol: 'BTC',
          currentPrice: 100_500,
          targetPrice: 100_000,
          direction: 'exact',
          triggeredAt: '2026-09-30T10:00:01.000Z',
        },
      },
    ]);

    controller.abort();
    const { done } = await reader.read();
    expect(done).toBe(true);
    expect(priceAlertWorker.listenerCount('triggered')).toBe(0);
    expect(priceAlertWorker.listenerCount('price')).toBe(0);
  });
});
