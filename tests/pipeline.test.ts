import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server, waitFor, SUPABASE_REST } from './setup';
import { clearDedupCache, processTweets } from '@/lib/services/twitter/pipeline';
import type { SocialAlertRow, TweetData } from '@/lib/services/twitter/types';

type Trigger = (alert: SocialAlertRow, tweet: TweetData) => Promise<void>;
const noopTrigger: Trigger = async () => {
  /* No-op in tests */
};

const alert: SocialAlertRow = {
  id: 'alert-1',
  user_id: 'user-1',
  platform: 'twitter',
  account: 'satoshi',
  keywords: ['btc', 'halving'],
};

function tweet(id: string, text: string, author = 'satoshi'): TweetData {
  return {
    id,
    text,
    type: 'original',
    author: { userName: author },
    createdAt: '2026-09-30T10:00:00Z',
    url: `https://x.com/${author}/status/${id}`,
  };
}

describe('processTweets (injected deps, no DB)', () => {
  beforeEach(() => {
    clearDedupCache();
  });

  it('triggers only alerts matching the author and keywords', async () => {
    const onTrigger = vi.fn<Trigger>(noopTrigger);
    const result = await processTweets(
      [
        tweet('1', 'The $BTC halving is coming'),
        tweet('2', 'Nothing to see here'),
        tweet('3', 'btc everywhere', 'impostor'),
      ],
      { alerts: [alert], onTrigger, skipPersistence: true }
    );

    expect(result).toMatchObject({ processed: 3, matched: 1, triggered: 1 });
    expect(onTrigger).toHaveBeenCalledTimes(1);
    expect(onTrigger.mock.calls[0]?.[1].id).toBe('1');
    expect(result.matches?.[0].matchedKeywords).toEqual(['btc', 'halving']);
  });

  it('dedups tweets across calls within a process', async () => {
    const onTrigger = vi.fn<Trigger>(noopTrigger);
    await processTweets([tweet('1', 'btc')], { alerts: [alert], onTrigger, skipPersistence: true });
    const second = await processTweets([tweet('1', 'btc')], {
      alerts: [alert],
      onTrigger,
      skipPersistence: true,
    });

    expect(second).toEqual({ processed: 0, matched: 0, triggered: 0 });
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('applies the sentiment filter (neutral without an AI key)', async () => {
    const onTrigger = vi.fn<Trigger>(noopTrigger);
    const result = await processTweets([tweet('1', 'btc to the moon')], {
      alerts: [{ ...alert, sentiment_filter: 'bullish' }],
      onTrigger,
      skipPersistence: true,
    });

    expect(result.matched).toBe(1);
    expect(result.triggered).toBe(0);
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('never triggers for retweets', async () => {
    const onTrigger = vi.fn<Trigger>(noopTrigger);
    const result = await processTweets([{ ...tweet('1', 'RT btc'), type: 'retweet' }], {
      alerts: [alert],
      onTrigger,
      skipPersistence: true,
    });
    expect(result.matched).toBe(0);
  });
});

describe('processTweets (persisted): usage accounting', () => {
  beforeEach(() => {
    clearDedupCache();
  });

  it('claims tweets once and bills each delivered post to every user watching the author', async () => {
    const rpcCalls: { p_month: string; p_rows: { user_id: string; delivered: number }[] }[] = [];
    server.use(
      http.post(`${SUPABASE_REST}/processed_tweets`, async ({ request }) => {
        const rows = (await request.json()) as { tweet_id: string }[];
        return HttpResponse.json(
          rows.map((r) => ({ tweet_id: r.tweet_id })),
          { status: 201 }
        );
      }),
      http.post(`${SUPABASE_REST}/rpc/increment_user_stream_usage`, async ({ request }) => {
        rpcCalls.push((await request.json()) as (typeof rpcCalls)[number]);
        return HttpResponse.json(null, { status: 204 });
      })
    );

    const alerts: SocialAlertRow[] = [
      alert,
      { ...alert, id: 'alert-2', user_id: 'user-2', keywords: ['nothing-matches'] },
      { ...alert, id: 'alert-3', user_id: 'user-3', account: 'vitalik', keywords: ['eth'] },
    ];
    const onTrigger = vi.fn<Trigger>(noopTrigger);

    const result = await processTweets(
      [tweet('1', 'btc up'), tweet('2', 'quiet day'), tweet('3', 'eth merge', 'vitalik')],
      { alerts, onTrigger }
    );

    await waitFor(() => rpcCalls.length === 1);
    const rows = rpcCalls[0].p_rows.toSorted((a, b) => a.user_id.localeCompare(b.user_id));

    // Both user-1 and user-2 watch @satoshi: 2 delivered posts each, keyword match or not.
    expect(rows).toEqual([
      { user_id: 'user-1', delivered: 2 },
      { user_id: 'user-2', delivered: 2 },
      { user_id: 'user-3', delivered: 1 },
    ]);
    expect(rpcCalls[0].p_month).toMatch(/^\d{4}-\d{2}$/);
    expect(result.triggered).toBe(2);
  });
});
