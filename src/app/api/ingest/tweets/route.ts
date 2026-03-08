import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthFromRequest, AuthError } from '@/lib/api/auth';
import { processTweets } from '@/lib/services/twitter/pipeline';

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

const ingestSchema = z.object({
  tweets: z.array(tweetSchema).min(1).max(100),
});

export async function POST(request: NextRequest) {
  try {
    await requireAuthFromRequest(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
    const result = await processTweets(parsed.data.tweets);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[Ingest] Error processing tweets:', error);
    return NextResponse.json({ error: 'Failed to process tweets' }, { status: 500 });
  }
}
