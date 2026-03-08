import { type NextRequest, NextResponse } from 'next/server';
import { requireApifyToken } from '@/lib/services/apify/config';
import { processTweets } from '@/lib/services/twitter/pipeline';
import type { TweetData } from '@/lib/services/twitter/types';
import { z } from 'zod';
import { createHmac, timingSafeEqual } from 'node:crypto';

const apifyWebhookSchema = z.object({
  eventType: z.enum(['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED', 'ACTOR.RUN.TIMED_OUT']),
  eventData: z.object({
    actorId: z.string(),
    actorRunId: z.string(),
    actorTaskId: z.string().optional(),
    startedAt: z.string(),
    finishedAt: z.string(),
    status: z.enum(['SUCCEEDED', 'FAILED', 'TIMED_OUT']),
    stats: z
      .object({
        inputDatasetId: z.string().optional(),
        outputDatasetId: z.string().optional(),
        outputDatasetItemCount: z.number().optional(),
      })
      .optional(),
    defaultDatasetId: z.string().optional(),
    buildId: z.string().optional(),
    buildNumber: z.string().optional(),
  }),
  resource: z.object({
    id: z.string(),
    type: z.literal('actor-run'),
    url: z.string(),
  }),
  createdAt: z.string(),
});

interface ApifyTweet {
  text: string;
  url?: string;
  author?: {
    userName?: string;
  };
  likesCount?: number;
  retweetsCount?: number;
  repliesCount?: number;
}

// --- Apify-specific helpers ---

function normalizeApifyTweet(tweet: ApifyTweet, index: number): TweetData {
  return {
    id: tweet.url || `apify-${Date.now()}-${String(index)}`,
    text: tweet.text,
    author: {
      userName: tweet.author?.userName || 'unknown',
      displayName: tweet.author?.userName || 'unknown',
    },
    createdAt: new Date().toISOString(),
    url: tweet.url || '',
    engagement: {
      likes: tweet.likesCount || 0,
      retweets: tweet.retweetsCount || 0,
      replies: tweet.repliesCount || 0,
    },
  };
}

async function fetchTweetsFromDataset(datasetId: string): Promise<ApifyTweet[]> {
  const token = requireApifyToken();

  const response = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`,
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch dataset: ${response.statusText}`);
  }

  return response.json();
}

function verifyApifySignature(body: string, signature: string): boolean {
  const secret = process.env.APIFY_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('APIFY_WEBHOOK_SECRET environment variable is required');
  }

  const expected = createHmac('sha256', secret).update(body).digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  const signatureBuf = Buffer.from(signature, 'hex');

  if (expectedBuf.length !== signatureBuf.length) {
    return false;
  }

  return timingSafeEqual(expectedBuf, signatureBuf);
}

// --- Route handler ---

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-apify-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing webhook signature' }, { status: 401 });
    }

    const rawBody = await request.text();

    if (!verifyApifySignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const webhookData = apifyWebhookSchema.parse(body);

    if (webhookData.eventData.status !== 'SUCCEEDED') {
      return NextResponse.json({ success: true, message: 'Webhook received but run not successful' });
    }

    const outputDatasetId = webhookData.eventData.stats?.outputDatasetId;
    if (!outputDatasetId) {
      return NextResponse.json({ success: true, message: 'No output dataset found' });
    }

    const apifyTweets = await fetchTweetsFromDataset(outputDatasetId);

    if (apifyTweets.length === 0) {
      return NextResponse.json({ success: true, message: 'No tweets to process' });
    }

    // Normalize Apify format → TweetData, then use shared pipeline
    const normalizedTweets = apifyTweets.map((tweet, index) => normalizeApifyTweet(tweet, index));
    const result = await processTweets(normalizedTweets);

    return NextResponse.json({
      success: true,
      message: `Processed ${result.processed} tweets, ${result.matched} matches, ${result.triggered} triggered`,
    });
  } catch (error) {
    console.error('Error processing Apify webhook:', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
