import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { broadcastUpdate } from '@/actions/monitor/lib/realtime';
import { sendUnifiedAlert } from '@/actions/messaging/unified-notifications';
import { z } from 'zod';

// Apify webhook payload schema
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

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (optional but recommended)
    const signature = request.headers.get('x-apify-signature');
    if (!signature) {
      console.warn('Apify webhook received without signature');
    }

    // Parse and validate the webhook payload
    const body = await request.json();
    const webhookData = apifyWebhookSchema.parse(body);

    console.warn('Apify webhook received:', {
      eventType: webhookData.eventType,
      actorId: webhookData.eventData.actorId,
      status: webhookData.eventData.status,
    });

    // Only process successful runs
    if (webhookData.eventData.status !== 'SUCCEEDED') {
      return NextResponse.json({
        success: true,
        message: 'Webhook received but run not successful',
      });
    }

    // Get the output dataset to fetch new tweets
    const outputDatasetId = webhookData.eventData.stats?.outputDatasetId;
    if (!outputDatasetId) {
      return NextResponse.json({
        success: true,
        message: 'No output dataset found',
      });
    }

    // Fetch new tweets from Apify dataset
    const tweets = await fetchTweetsFromDataset(outputDatasetId);

    if (tweets.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new tweets found',
      });
    }

    // Process tweets and trigger alerts
    await processTweetsAndTriggerAlerts(tweets);

    return NextResponse.json({
      success: true,
      message: `Processed ${tweets.length} tweets`,
    });
  } catch (error) {
    console.error('Error processing Apify webhook:', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}

async function fetchTweetsFromDataset(datasetId: string) {
  const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
  if (!APIFY_API_TOKEN) {
    throw new Error('APIFY_API_TOKEN not configured');
  }

  const response = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch dataset: ${response.statusText}`);
  }

  return await response.json();
}

async function processTweetsAndTriggerAlerts(tweets: any[]) {
  const supabase = await createServerSupabaseClient();

  // Get all active social alerts
  const { data: alerts } = await supabase.from('social_alerts').select('*').eq('is_active', true);

  if (!alerts || alerts.length === 0) {
    return;
  }

  // Group alerts by account
  const alertsByAccount = new Map<string, any[]>();
  for (const alert of alerts) {
    const account = alert.platform.toLowerCase();
    if (!alertsByAccount.has(account)) {
      alertsByAccount.set(account, []);
    }
    alertsByAccount.get(account)!.push(alert);
  }

  // Process each tweet
  for (const tweet of tweets) {
    const account = tweet.author?.userName?.toLowerCase();
    if (!account || !alertsByAccount.has(account)) {
      continue;
    }

    const accountAlerts = alertsByAccount.get(account)!;

    for (const alert of accountAlerts) {
      const hasMatchingKeywords = alert.keywords.some((keyword: string) =>
        tweet.text.toLowerCase().includes(keyword.toLowerCase())
      );

      if (hasMatchingKeywords) {
        await triggerAlert(alert, tweet);
      }
    }
  }
}

async function triggerAlert(alert: any, tweet: any) {
  try {
    const supabase = await createServerSupabaseClient();

    // Record the trigger
    await supabase.from('alert_triggers').insert({
      alert_id: alert.id,
      user_id: alert.user_id,
      type: 'social',
      data: {
        platform: alert.platform,
        content: tweet.text,
        keywords: alert.keywords,
        tweet_url: tweet.url,
        author: tweet.author?.userName,
        engagement: {
          likes: tweet.likesCount || 0,
          retweets: tweet.retweetsCount || 0,
          replies: tweet.repliesCount || 0,
        },
      },
    });

    // Send SSE event to connected clients
    await broadcastUpdate('social', {
      platform: alert.platform,
      account: alert.platform,
      content: tweet.text,
      keywords: alert.keywords,
      tweet_url: tweet.url,
      author: tweet.author?.userName,
      engagement: {
        likes: tweet.likesCount || 0,
        retweets: tweet.retweetsCount || 0,
        replies: tweet.repliesCount || 0,
      },
      timestamp: Date.now(),
    });

    // Send Telegram alert
    await sendUnifiedAlert({
      userId: alert.user_id,
      alertType: 'social',
      message: `🚨 Social Alert: @${alert.platform} mentioned your keywords`,
      data: {
        account: alert.platform,
        keywords: alert.keywords,
        tweet_url: tweet.url,
        content: tweet.text.substring(0, 100) + '...',
      },
    });

    console.warn(`Alert triggered for ${alert.platform}: "${tweet.text.substring(0, 50)}..."`);
  } catch (error) {
    console.error('Error triggering alert:', error);
  }
}
