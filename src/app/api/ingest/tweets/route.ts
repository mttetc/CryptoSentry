import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { processTweets } from '@/lib/services/twitter/pipeline';
import type { SocialAlertRow, TweetData } from '@/lib/services/twitter/types';

/**
 * Development-only endpoint to push fake tweets through the pipeline without X.
 * Disabled in production: the real source is the X filtered stream started in instrumentation.ts.
 */

const tweetSchema = z.object({
  id: z.string(),
  text: z.string(),
  type: z.enum(['original', 'reply', 'retweet', 'quote']).default('original'),
  author: z.object({ userName: z.string() }),
  createdAt: z.string().default(() => new Date().toISOString()),
  url: z.string().optional(),
});

const alertSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  platform: z.string().default('twitter'),
  account: z.string(),
  keywords: z.array(z.string()),
  include_replies: z.boolean().optional(),
});

const ingestSchema = z.object({
  tweets: z.array(tweetSchema).min(1).max(100),
  alerts: z.array(alertSchema).optional(),
});

function devTrigger(alert: SocialAlertRow, tweet: TweetData): Promise<void> {
  console.warn(
    `[DEV TRIGGER] Alert "${alert.id}" matched tweet "${tweet.id}" ` +
      `(@${tweet.author.userName}: "${tweet.text.slice(0, 60)}")`
  );
  return Promise.resolve();
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = ingestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const tweets: TweetData[] = parsed.data.tweets.map((t) => ({
    ...t,
    url: t.url ?? `https://x.com/${t.author.userName}/status/${t.id}`,
  }));

  try {
    // With explicit alerts: log-only triggers, no DB. Without: real alerts + real notifications (dev DB).
    const result = await processTweets(
      tweets,
      parsed.data.alerts
        ? { alerts: parsed.data.alerts, onTrigger: devTrigger, skipPersistence: true }
        : undefined
    );
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[Ingest] Error processing tweets:', error);
    return NextResponse.json({ error: 'Failed to process tweets' }, { status: 500 });
  }
}
