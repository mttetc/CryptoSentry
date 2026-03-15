import type {
  TweetData,
  SocialAlertRow,
  ProcessingResult,
  PipelineDeps,
  AnalyzedMatch,
} from './types';
import { createServiceSupabaseClient } from '@/lib/supabase/server';
import { sendUnifiedAlert } from '@/actions/messaging/unified-notifications';
import { analyzeTweet } from '@/lib/services/ai';
import { captureInfluencerEvent } from '@/lib/services/influencer/scorer';

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

// --- AI analysis ---

async function analyzeMatches(
  matches: { alert: SocialAlertRow; tweet: TweetData }[]
): Promise<AnalyzedMatch[]> {
  const analyses = await Promise.allSettled(
    matches.map(async ({ alert, tweet }) => {
      const analysis = await analyzeTweet(tweet.text);
      return { alert, tweet, sentiment: analysis.sentiment, summary: analysis.summary };
    })
  );

  return analyses
    .filter((r): r is PromiseFulfilledResult<AnalyzedMatch> => r.status === 'fulfilled')
    .map((r) => r.value);
}

function filterBySentiment(matches: AnalyzedMatch[]): AnalyzedMatch[] {
  return matches.filter(({ alert, sentiment }) => {
    if (!alert.sentiment_filter) {
      return true;
    }
    return alert.sentiment_filter === sentiment;
  });
}

// --- I/O helpers (used in prod when no deps injected) ---

export async function fetchActiveAlerts(): Promise<SocialAlertRow[]> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('social_alerts')
    .select('id, user_id, platform, keywords, sentiment_filter, account, call_enabled')
    .eq('is_active', true);

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

async function persistTrigger(
  alert: SocialAlertRow,
  tweet: TweetData,
  sentiment?: string,
  summary?: string
): Promise<void> {
  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from('alert_triggers').insert({
    alert_id: alert.id,
    user_id: alert.user_id,
    type: 'social',
    sentiment,
    summary,
    data: {
      content: tweet.text,
      tweet_url: tweet.url,
      tweet_id: tweet.id,
      author: tweet.author.userName,
      engagement: buildEngagement(tweet),
    },
    triggered_at: new Date().toISOString(),
  });

  if (error) {
    console.error('[Pipeline] Error persisting trigger:', error);
  }
}

async function triggerAlert(
  alert: SocialAlertRow,
  tweet: TweetData,
  sentiment?: string,
  summary?: string
): Promise<void> {
  const notification = {
    userId: alert.user_id,
    alertType: 'social' as const,
    message: `Social Alert: ${alert.platform} mentioned your keywords`,
    data: {
      account: alert.account,
      keywords: alert.keywords,
      tweet_url: tweet.url,
      sentiment,
      summary,
    },
  };

  await Promise.allSettled([
    persistTrigger(alert, tweet, sentiment, summary),
    sendUnifiedAlert(notification),
  ]);

  // Fire-and-forget: capture influencer event for scoring
  captureInfluencerEvent(alert.account, tweet.text, tweet.id).catch(() => {
    // Silent - scoring is non-critical
  });
}

// --- Main entry point ---

/**
 * Process tweets through the pipeline: dedup -> match -> analyze -> filter -> trigger.
 *
 * In prod: called with no deps - fetches alerts from Supabase, persists + broadcasts.
 * In dev/test: pass `deps` to inject alerts and a custom trigger (no Supabase needed).
 */
export async function processTweets(
  tweets: TweetData[],
  deps?: PipelineDeps
): Promise<ProcessingResult> {
  const fresh = dedup(tweets);
  if (fresh.length === 0) {
    return { processed: 0, matched: 0, triggered: 0 };
  }

  console.warn(`[Pipeline] Processing ${fresh.length} new tweets`);

  const alerts = deps ? deps.alerts : await fetchActiveAlerts();
  const twitterAlerts = alerts.filter((a) => a.platform === 'twitter');
  const matches = findMatches(twitterAlerts, fresh);

  if (matches.length === 0) {
    return { processed: fresh.length, matched: 0, triggered: 0 };
  }

  console.warn(`[Pipeline] Found ${matches.length} keyword matches`);

  // Analyze with AI (non-blocking, fallback to neutral)
  const analyzed = await analyzeMatches(matches);
  const filtered = filterBySentiment(analyzed);

  console.warn(`[Pipeline] After sentiment filter: ${filtered.length} matches`);

  const onTrigger = deps?.onTrigger;

  const results = await Promise.allSettled(
    filtered.map(({ alert, tweet, sentiment, summary }) =>
      onTrigger ? onTrigger(alert, tweet) : triggerAlert(alert, tweet, sentiment, summary)
    )
  );

  const triggered = results.filter((r) => r.status === 'fulfilled').length;

  return { processed: fresh.length, matched: matches.length, triggered, matches: filtered };
}
