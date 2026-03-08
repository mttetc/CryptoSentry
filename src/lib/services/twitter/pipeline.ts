import type { TweetData, SocialAlertRow, ProcessingResult } from './types';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { broadcastUpdate } from '@/actions/monitor/lib/realtime';
import { sendUnifiedAlert } from '@/actions/messaging/unified-notifications';

// --- Dedup cache (singleton per process) ---

const seenTweetIds = new Set<string>();
const MAX_SEEN_CACHE = 10_000;

export function dedup(tweets: TweetData[]): TweetData[] {
  const fresh: TweetData[] = [];

  for (const tweet of tweets) {
    if (seenTweetIds.has(tweet.id)) {
      continue;
    }
    seenTweetIds.add(tweet.id);
    fresh.push(tweet);
  }

  // Evict oldest entries when cache grows too large
  if (seenTweetIds.size > MAX_SEEN_CACHE) {
    const excess = seenTweetIds.size - MAX_SEEN_CACHE;
    const iterator = seenTweetIds.values();
    for (let i = 0; i < excess; i++) {
      const next = iterator.next();
      if (!next.done) {
        seenTweetIds.delete(next.value);
      }
    }
  }

  return fresh;
}

export function clearDedupCache(): void {
  seenTweetIds.clear();
}

// --- Keyword matching ---

interface KeywordIndex {
  keyword: string;
  alert: SocialAlertRow;
}

export function buildKeywordIndex(alerts: SocialAlertRow[]): KeywordIndex[] {
  return alerts.flatMap((alert) =>
    alert.keywords.map((keyword) => ({
      keyword: keyword.toLowerCase(),
      alert,
    }))
  );
}

export function findMatches(
  alerts: SocialAlertRow[],
  tweets: TweetData[]
): { alert: SocialAlertRow; tweet: TweetData }[] {
  const index = buildKeywordIndex(alerts);
  const matches: { alert: SocialAlertRow; tweet: TweetData }[] = [];

  for (const tweet of tweets) {
    const lowerText = tweet.text.toLowerCase();
    const matchedAlertIds = new Set<string>();

    for (const { keyword, alert } of index) {
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

// --- I/O helpers ---

export async function fetchActiveAlerts(): Promise<SocialAlertRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('social_alerts')
    .select('*')
    .eq('active', true);

  if (error) {
    console.error('[Pipeline] Error loading alerts:', error);
    return [];
  }

  return (data as SocialAlertRow[]) || [];
}

function buildEngagement(tweet: TweetData) {
  return {
    likes: tweet.engagement?.likes ?? 0,
    retweets: tweet.engagement?.retweets ?? 0,
    replies: tweet.engagement?.replies ?? 0,
  };
}

async function persistTrigger(alert: SocialAlertRow, tweet: TweetData): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from('alert_triggers').insert({
    alert_id: alert.id,
    triggered_at: new Date().toISOString(),
    content: tweet.text,
    tweet_url: tweet.url,
    tweet_id: tweet.id,
    author: tweet.author.userName,
    engagement: buildEngagement(tweet),
  });

  if (error) {
    console.error('[Pipeline] Error persisting trigger:', error);
  }
}

async function triggerAlert(alert: SocialAlertRow, tweet: TweetData): Promise<void> {
  const broadcastData: Record<string, unknown> = {
    platform: alert.platform,
    account: alert.account,
    content: tweet.text,
    keywords: alert.keywords,
    tweet_url: tweet.url,
    author: tweet.author.userName,
    engagement: buildEngagement(tweet),
    timestamp: Date.now(),
  };

  const notification = {
    userId: alert.user_id,
    alertType: 'social' as const,
    message: `Social Alert: ${alert.platform} mentioned your keywords`,
    data: {
      account: alert.account,
      keywords: alert.keywords,
      tweet_url: tweet.url,
    },
  };

  await Promise.allSettled([
    persistTrigger(alert, tweet),
    broadcastUpdate('social', broadcastData),
    sendUnifiedAlert(notification),
  ]);
}

// --- Main entry point ---

export async function processTweets(tweets: TweetData[]): Promise<ProcessingResult> {
  const fresh = dedup(tweets);
  if (fresh.length === 0) {
    return { processed: 0, matched: 0, triggered: 0 };
  }

  console.warn(`[Pipeline] Processing ${fresh.length} new tweets`);

  const alerts = await fetchActiveAlerts();
  const twitterAlerts = alerts.filter((a) => a.platform === 'twitter');
  const matches = findMatches(twitterAlerts, fresh);

  if (matches.length === 0) {
    return { processed: fresh.length, matched: 0, triggered: 0 };
  }

  console.warn(`[Pipeline] Found ${matches.length} keyword matches`);

  const results = await Promise.allSettled(
    matches.map(({ alert, tweet }) => triggerAlert(alert, tweet))
  );

  const triggered = results.filter((r) => r.status === 'fulfilled').length;

  return { processed: fresh.length, matched: matches.length, triggered };
}
