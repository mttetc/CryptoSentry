import { afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server, waitFor, SUPABASE_REST, X_API, sleep } from './setup';
import {
  XFilteredStreamProvider,
  normalizeStreamPayload,
  readXStreamConfig,
  tweetTypeFromPayload,
} from '@/lib/services/twitter/providers/x-filtered-stream';
import type { SocialAlertRow, TweetData } from '@/lib/services/twitter/types';

const alerts: SocialAlertRow[] = [
  {
    id: 'a1',
    user_id: 'u1',
    platform: 'twitter',
    account: 'satoshi',
    keywords: ['btc', 'halving'],
  },
  {
    id: 'a2',
    user_id: 'u2',
    platform: 'twitter',
    account: 'vitalik',
    keywords: ['eth'],
    include_replies: true,
  },
];

function streamLine(
  id: string,
  text: string,
  tag: string,
  referenced?: { type: string; id: string }[]
) {
  return `${JSON.stringify({
    data: { id, text, created_at: '2026-09-30T10:00:00.000Z', referenced_tweets: referenced },
    matching_rules: [{ id: 'r', tag }],
  })}\r\n`;
}

/** Handlers for X rules + stream and Supabase usage table + RPC. Returns captured requests. */
function mockXAndSupabase(options: {
  remoteRules?: { id: string; value: string; tag?: string }[];
  streamLines?: string[];
  usageDelivered?: number;
}) {
  const captured = {
    ruleBodies: [] as Record<string, unknown>[],
    streamRequests: [] as URL[],
    rpcCalls: [] as Record<string, unknown>[],
  };

  const rules: { id: string; value: string; tag?: string }[] = [...(options.remoteRules ?? [])];
  let nextId = 1000;

  server.use(
    http.get(`${X_API}/tweets/search/stream/rules`, () => HttpResponse.json({ data: rules })),
    http.post(`${X_API}/tweets/search/stream/rules`, async ({ request }) => {
      const body = (await request.json()) as {
        add?: { value: string; tag: string }[];
        delete?: { ids: string[] };
      };
      captured.ruleBodies.push(body);
      if (body.delete) {
        for (const id of body.delete.ids) {
          const index = rules.findIndex((r) => r.id === id);
          if (index !== -1) {
            rules.splice(index, 1);
          }
        }
      }
      for (const rule of body.add ?? []) {
        rules.push({ id: String(nextId++), ...rule });
      }
      return HttpResponse.json({ meta: { sent: new Date().toISOString() } });
    }),
    http.get(`${X_API}/tweets/search/stream`, ({ request }) => {
      captured.streamRequests.push(new URL(request.url));
      const encoder = new TextEncoder();
      const lines = options.streamLines ?? [];
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          for (const line of lines) {
            controller.enqueue(encoder.encode(line));
          }
          controller.close();
        },
      });
      return new HttpResponse(body, { headers: { 'Content-Type': 'application/json' } });
    }),
    http.get(`${SUPABASE_REST}/x_stream_usage`, () =>
      HttpResponse.json(
        options.usageDelivered === undefined ? [] : [{ delivered: options.usageDelivered }]
      )
    ),
    http.post(`${SUPABASE_REST}/rpc/increment_x_stream_usage`, async ({ request }) => {
      const body = (await request.json()) as { p_count: number };
      captured.rpcCalls.push(body);
      return HttpResponse.json((options.usageDelivered ?? 0) + body.p_count);
    })
  );

  return captured;
}

describe('readXStreamConfig', () => {
  afterEach(() => {
    delete process.env.X_BEARER_TOKEN;
    delete process.env.X_STREAM_MONTHLY_POST_CAP;
    delete process.env.X_STREAM_MAX_RULES;
  });

  it('is null without a bearer token (social alerts disabled)', () => {
    expect(readXStreamConfig()).toBeNull();
  });

  it('reads caps with safe defaults and never exceeds the X rule limit', () => {
    process.env.X_BEARER_TOKEN = 'tok';
    expect(readXStreamConfig()).toEqual({
      bearerToken: 'tok',
      monthlyPostCap: 20_000,
      maxRules: 900,
    });
    process.env.X_STREAM_MAX_RULES = '5000';
    process.env.X_STREAM_MONTHLY_POST_CAP = '100';
    expect(readXStreamConfig()).toMatchObject({ monthlyPostCap: 100, maxRules: 1000 });
  });
});

describe('payload normalization', () => {
  it('derives the tweet type from referenced_tweets', () => {
    expect(tweetTypeFromPayload({ id: '1', text: 'x' })).toBe('original');
    expect(
      tweetTypeFromPayload({
        id: '1',
        text: 'x',
        referenced_tweets: [{ type: 'retweeted', id: '2' }],
      })
    ).toBe('retweet');
    expect(
      tweetTypeFromPayload({
        id: '1',
        text: 'x',
        referenced_tweets: [{ type: 'replied_to', id: '2' }],
      })
    ).toBe('reply');
    expect(
      tweetTypeFromPayload({ id: '1', text: 'x', referenced_tweets: [{ type: 'quoted', id: '2' }] })
    ).toBe('quote');
  });

  it('recovers the author from the rule tag and drops payloads without a rule', () => {
    const tweet = normalizeStreamPayload({
      data: { id: '9', text: 'hello', created_at: '2026-09-30T10:00:00.000Z' },
      matching_rules: [{ id: 'r', tag: 'satoshi#2' }],
    });
    expect(tweet).toMatchObject({
      id: '9',
      author: { userName: 'satoshi' },
      url: 'https://x.com/satoshi/status/9',
    });
    expect(normalizeStreamPayload({ data: { id: '9', text: 'hello' } })).toBeNull();
  });
});

describe('XFilteredStreamProvider', () => {
  it('syncs rules: deletes stale remote rules, adds missing ones, respects the rule cap', async () => {
    const captured = mockXAndSupabase({
      remoteRules: [
        { id: 'stale', value: 'from:oldaccount (foo) -is:retweet -is:reply -is:quote' },
        {
          id: 'keep',
          value: 'from:satoshi (btc OR halving) -is:retweet -is:reply -is:quote',
          tag: 'satoshi',
        },
      ],
    });
    const provider = new XFilteredStreamProvider({
      bearerToken: 'tok',
      monthlyPostCap: 100,
      maxRules: 1,
    });

    await provider.syncAlerts(alerts);

    expect(captured.ruleBodies[0]).toEqual({ delete: { ids: ['stale'] } });
    // With maxRules = 1 only the first rule (satoshi, already remote) is kept, so nothing is added
    expect(captured.ruleBodies).toHaveLength(1);
    expect(provider.getStatus()).toMatchObject({ rules: 1, droppedRules: 1 });
  });

  it('adds new rules with the expected operators', async () => {
    const captured = mockXAndSupabase({});
    const provider = new XFilteredStreamProvider({
      bearerToken: 'tok',
      monthlyPostCap: 100,
      maxRules: 900,
    });

    await provider.syncAlerts(alerts);

    expect(captured.ruleBodies).toEqual([
      {
        add: [
          {
            value: 'from:satoshi (btc OR halving) -is:retweet -is:reply -is:quote',
            tag: 'satoshi',
          },
          { value: 'from:vitalik (eth) -is:retweet', tag: 'vitalik' },
        ],
      },
    ]);
  });

  it('does not open the stream when there are no rules (no cost)', async () => {
    const captured = mockXAndSupabase({});
    const provider = new XFilteredStreamProvider({
      bearerToken: 'tok',
      monthlyPostCap: 100,
      maxRules: 900,
    });

    await provider.start(async () => null);
    await sleep(50);
    await provider.stop();

    expect(captured.streamRequests).toHaveLength(0);
  });

  it('streams delivered posts to the callback with minimal fields, ignoring keep-alives', async () => {
    const captured = mockXAndSupabase({
      streamLines: [
        '\r\n',
        streamLine('101', 'btc halving soon', 'satoshi'),
        '\r\n',
        streamLine('102', '@someone eth is fine', 'vitalik#1', [{ type: 'replied_to', id: '5' }]),
        `${JSON.stringify({ errors: [{ title: 'operational-disconnect', disconnect_type: 'UpstreamOperationalDisconnect' }] })}\r\n`,
      ],
    });
    const provider = new XFilteredStreamProvider({
      bearerToken: 'tok',
      monthlyPostCap: 100,
      maxRules: 900,
    });
    const received: TweetData[] = [];

    await provider.syncAlerts(alerts);
    await provider.start(async (tweets) => {
      received.push(...tweets);
    });
    await waitFor(() => received.length === 2);
    await provider.stop();

    expect(captured.streamRequests[0].searchParams.get('tweet.fields')).toBe(
      'created_at,referenced_tweets'
    );
    expect(captured.streamRequests[0].searchParams.has('expansions')).toBe(false);
    expect(received[0]).toEqual({
      id: '101',
      text: 'btc halving soon',
      type: 'original',
      author: { userName: 'satoshi' },
      createdAt: '2026-09-30T10:00:00.000Z',
      url: 'https://x.com/satoshi/status/101',
    });
    expect(received[1]).toMatchObject({
      id: '102',
      type: 'reply',
      author: { userName: 'vitalik' },
    });
    // Usage flushed on stop: 2 delivered posts billed
    expect(captured.rpcCalls.reduce((sum, c) => sum + Number(c.p_count), 0)).toBe(2);
  });

  it('stops consuming once the monthly cap is reached', async () => {
    const captured = mockXAndSupabase({
      usageDelivered: 1,
      streamLines: [
        streamLine('201', 'btc one', 'satoshi'),
        streamLine('202', 'btc two', 'satoshi'),
        streamLine('203', 'btc three', 'satoshi'),
      ],
    });
    const provider = new XFilteredStreamProvider({
      bearerToken: 'tok',
      monthlyPostCap: 2,
      maxRules: 900,
    });
    const received: TweetData[] = [];

    await provider.syncAlerts(alerts);
    await provider.start(async (tweets) => {
      received.push(...tweets);
    });
    await waitFor(() => provider.getStatus().capped === true);
    await provider.stop();

    expect(received.length).toBeLessThanOrEqual(1);
    expect(provider.getStatus()).toMatchObject({
      capped: true,
      lastError: 'monthly post cap reached',
    });
    expect(captured.streamRequests).toHaveLength(1);
  });

  it('never connects when the cap was already reached earlier this month', async () => {
    const captured = mockXAndSupabase({
      usageDelivered: 50,
      streamLines: [streamLine('1', 'btc', 'satoshi')],
    });
    const provider = new XFilteredStreamProvider({
      bearerToken: 'tok',
      monthlyPostCap: 50,
      maxRules: 900,
    });

    await provider.syncAlerts(alerts);
    await provider.start(async () => null);
    await sleep(50);
    await provider.stop();

    expect(captured.streamRequests).toHaveLength(0);
    expect(provider.getStatus().capped).toBe(true);
  });
});
