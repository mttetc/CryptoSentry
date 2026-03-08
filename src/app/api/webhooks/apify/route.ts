import { type NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { broadcastUpdate } from '@/actions/monitor/lib/realtime';
import { sendUnifiedAlert } from '@/actions/messaging/unified-notifications';
import { requireApifyToken } from '@/lib/services/apify/config';
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

interface SocialAlertRecord {
  id: string;
  user_id: string;
  platform: string;
  account: string;
  keywords: string[];
  is_active: boolean;
}

// --- Pure functions ---

interface KeywordEntry {
  keyword: string;
  alert: SocialAlertRecord;
}

/**
 * Build a keyword→alerts index per account.
 * O(m × k) where m=alerts, k=avg keywords per alert.
 */
function buildAccountKeywordIndex(
  alerts: SocialAlertRecord[]
): Map<string, KeywordEntry[]> {
  const index = new Map<string, KeywordEntry[]>();

  for (const alert of alerts) {
    const account = alert.platform.toLowerCase();
    const entries = index.get(account) || [];

    for (const keyword of alert.keywords) {
      entries.push({ keyword: keyword.toLowerCase(), alert });
    }

    index.set(account, entries);
  }

  return index;
}

function buildEngagement(tweet: ApifyTweet) {
  return {
    likes: tweet.likesCount || 0,
    retweets: tweet.retweetsCount || 0,
    replies: tweet.repliesCount || 0,
  };
}

function buildTriggerData(alert: SocialAlertRecord, tweet: ApifyTweet): Record<string, unknown> {
  return {
    alert_id: alert.id,
    user_id: alert.user_id,
    type: 'social',
    data: {
      platform: alert.platform,
      content: tweet.text,
      keywords: alert.keywords,
      tweet_url: tweet.url,
      author: tweet.author?.userName,
      engagement: buildEngagement(tweet),
    },
  };
}

function buildBroadcastData(alert: SocialAlertRecord, tweet: ApifyTweet): Record<string, unknown> {
  return {
    platform: alert.platform,
    account: alert.platform,
    content: tweet.text,
    keywords: alert.keywords,
    tweet_url: tweet.url,
    author: tweet.author?.userName,
    engagement: buildEngagement(tweet),
    timestamp: Date.now(),
  };
}

function buildNotification(alert: SocialAlertRecord, tweet: ApifyTweet) {
  return {
    userId: alert.user_id,
    alertType: 'social' as const,
    message: `Social Alert: @${alert.platform} mentioned your keywords`,
    data: {
      account: alert.platform,
      keywords: alert.keywords,
      tweet_url: tweet.url,
      content: tweet.text.slice(0, 100),
    },
  };
}

/**
 * O(n × k) with account-level Map lookup + keyword index.
 * No nested alert loop — keyword entries are pre-flattened.
 * Deduplicates alert matches per tweet via Set.
 */
function findMatchingPairs(
  tweets: ApifyTweet[],
  accountKeywordIndex: Map<string, KeywordEntry[]>
): { alert: SocialAlertRecord; tweet: ApifyTweet }[] {
  const matches: { alert: SocialAlertRecord; tweet: ApifyTweet }[] = [];

  for (const tweet of tweets) {
    const account = tweet.author?.userName?.toLowerCase();
    if (!account) {
      continue;
    }

    const entries = accountKeywordIndex.get(account);
    if (!entries) {
      continue;
    }

    const lowerText = tweet.text.toLowerCase();
    const matchedAlertIds = new Set<string>();

    for (const { keyword, alert } of entries) {
      if (matchedAlertIds.has(alert.id)) {
        continue;
      }

      if (lowerText.includes(keyword)) {
        matchedAlertIds.add(alert.id);
        matches.push({ alert, tweet });
      }
    }
  }

  return matches;
}

// --- Single-responsibility I/O ---

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

async function fetchActiveAlerts(): Promise<SocialAlertRecord[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('social_alerts')
    .select('id, user_id, platform, account, keywords, is_active')
    .eq('is_active', true);
  return data ?? [];
}

async function triggerSingleAlert(alert: SocialAlertRecord, tweet: ApifyTweet): Promise<void> {
  const supabase = await createServerSupabaseClient();

  // All three operations are independent — run in parallel
  await Promise.allSettled([
    supabase.from('alert_triggers').insert(buildTriggerData(alert, tweet)),
    broadcastUpdate('social', buildBroadcastData(alert, tweet)),
    sendUnifiedAlert(buildNotification(alert, tweet)),
  ]);
}

// --- Route handler ---

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

    // Fetch tweets and alerts in parallel — independent data sources
    const [tweets, alerts] = await Promise.all([
      fetchTweetsFromDataset(outputDatasetId),
      fetchActiveAlerts(),
    ]);

    if (tweets.length === 0 || alerts.length === 0) {
      return NextResponse.json({ success: true, message: 'No tweets or alerts to process' });
    }

    // Pure: build index once O(m×k), then match O(n×k)
    const keywordIndex = buildAccountKeywordIndex(alerts);
    const matches = findMatchingPairs(tweets, keywordIndex);

    // I/O: trigger all matches in parallel
    await Promise.allSettled(
      matches.map(({ alert, tweet }) => triggerSingleAlert(alert, tweet))
    );

    return NextResponse.json({
      success: true,
      message: `Processed ${tweets.length} tweets, ${matches.length} alerts triggered`,
    });
  } catch (error) {
    console.error('Error processing Apify webhook:', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
