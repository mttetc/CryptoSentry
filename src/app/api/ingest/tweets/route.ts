import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthFromRequest, AuthError } from '@/lib/api/auth';
import { processTweets } from '@/lib/services/twitter/pipeline';
import type { SocialAlertRow, TweetData, PipelineDeps } from '@/lib/services/twitter/types';

const tweetSchema = z.object({
  id: z.string(),
  text: z.string(),
  author: z.object({
    userName: z.string(),
    displayName: z.string(),
  }),
  createdAt: z.string(),
  url: z.string(),
  engagement: z
    .object({
      likes: z.number(),
      retweets: z.number(),
      replies: z.number(),
    })
    .optional(),
});

const alertSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  platform: z.string(),
  account: z.string(),
  keywords: z.array(z.string()),
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
  const isDev = process.env.NODE_ENV === 'development';

  if (!isDev) {
    try {
      await requireAuthFromRequest(request);
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
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

  try {
    // In dev with explicit alerts in body: use those + log-only trigger
    // Otherwise (dev without alerts, or prod): fetch from Supabase + real triggers
    const deps: PipelineDeps | undefined = isDev && parsed.data.alerts
      ? { alerts: parsed.data.alerts, onTrigger: devTrigger }
      : undefined;

    const result = await processTweets(parsed.data.tweets, deps);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[Ingest] Error processing tweets:', error);
    return NextResponse.json({ error: 'Failed to process tweets' }, { status: 500 });
  }
}
