import type {
  TweetData,
  SocialAlertRow,
  ProcessingResult,
  PipelineDeps,
  AnalyzedMatch,
} from './types';
import { findMatches, normalizeAccount, utcMonthKey, type Match } from './matching';
import { createServiceSupabaseClient } from '@/lib/supabase/server';
import { sendUnifiedAlert } from '@/actions/messaging/unified-notifications';
import { analyzeTweet } from '@/lib/services/ai';

// --- In-memory dedup (fast path; the processed_tweets table is the source of truth) ---

const seenTweetIds = new Set<string>();
const MAX_SEEN_CACHE = 10_000;
const PROCESSED_RETENTION_DAYS = 30;

export function dedup(tweets: TweetData[]): TweetData[] {
  const fresh: TweetData[] = [];
  const batchIds = new Set<string>();

  for (const tweet of tweets) {
    if (seenTweetIds.has(tweet.id) || batchIds.has(tweet.id)) {
      continue;
    }
    batchIds.add(tweet.id);
    fresh.push(tweet);
  }

  for (const id of batchIds) {
    seenTweetIds.add(id);
  }

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

/**
 * Claim tweets in processed_tweets. Only rows we inserted come back, so two processes (or a
 * restart replaying the same posts) can never notify twice.
 */
async function claimTweets(tweets: TweetData[]): Promise<TweetData[]> {
  if (tweets.length === 0) {
    return [];
  }
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('processed_tweets')
    .upsert(
      tweets.map((t) => ({ tweet_id: t.id, account: normalizeAccount(t.author.userName) })),
      { onConflict: 'tweet_id', ignoreDuplicates: true }
    )
    .select('tweet_id');

  if (error) {
    console.error('[Pipeline] Failed to claim tweets, processing without persistence:', error);
    return tweets;
  }

  const claimed = new Set((data ?? []).map((row) => row.tweet_id));
  return tweets.filter((t) => claimed.has(t.id));
}

/**
 * Attribute each delivered post to every user watching its author. This is what X bills us for
 * (one post, however many alerts match), so it is what the plan quota counts.
 */
export async function recordDeliveredUsage(
  tweets: TweetData[],
  alerts: SocialAlertRow[]
): Promise<void> {
  const usersByAccount = new Map<string, Set<string>>();
  for (const alert of alerts) {
    if (alert.is_active === false || alert.platform !== 'twitter') {
      continue;
    }
    const key = normalizeAccount(alert.account);
    const users = usersByAccount.get(key) ?? new Set<string>();
    users.add(alert.user_id);
    usersByAccount.set(key, users);
  }

  const counts = new Map<string, number>();
  for (const tweet of tweets) {
    for (const userId of usersByAccount.get(normalizeAccount(tweet.author.userName)) ?? []) {
      counts.set(userId, (counts.get(userId) ?? 0) + 1);
    }
  }
  if (counts.size === 0) {
    return;
  }

  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.rpc('increment_user_stream_usage', {
    p_month: utcMonthKey(),
    p_rows: [...counts].map(([user_id, delivered]) => ({ user_id, delivered })),
  });
  if (error) {
    console.error('[Pipeline] Failed to record delivered usage:', error);
  }
}

export async function pruneProcessedTweets(): Promise<void> {
  const supabase = createServiceSupabaseClient();
  const cutoff = new Date(
    Date.now() - PROCESSED_RETENTION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  const { error } = await supabase.from('processed_tweets').delete().lt('processed_at', cutoff);
  if (error) {
    console.error('[Pipeline] Failed to prune processed tweets:', error);
  }
}

// --- AI analysis ---

async function analyzeMatches(matches: Match[]): Promise<AnalyzedMatch[]> {
  // One analysis per distinct tweet, shared across alerts matching it.
  const byTweet = new Map<
    string,
    Promise<{ sentiment: AnalyzedMatch['sentiment']; summary: string }>
  >();
  for (const { tweet } of matches) {
    if (!byTweet.has(tweet.id)) {
      byTweet.set(tweet.id, analyzeTweet(tweet.text));
    }
  }

  const analyses = await Promise.allSettled(
    matches.map(async ({ alert, tweet, matchedKeywords }) => {
      const analysis = await (byTweet.get(tweet.id) ?? analyzeTweet(tweet.text));
      return {
        alert,
        tweet,
        matchedKeywords,
        sentiment: analysis.sentiment,
        summary: analysis.summary,
      };
    })
  );

  return analyses
    .filter((r): r is PromiseFulfilledResult<AnalyzedMatch> => r.status === 'fulfilled')
    .map((r) => r.value);
}

function filterBySentiment<T extends AnalyzedMatch>(matches: T[]): T[] {
  return matches.filter(
    ({ alert, sentiment }) => !alert.sentiment_filter || alert.sentiment_filter === sentiment
  );
}

// --- I/O helpers ---

export async function fetchActiveAlerts(): Promise<SocialAlertRow[]> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('social_alerts')
    .select(
      'id, user_id, platform, keywords, sentiment_filter, account, call_enabled, include_replies'
    )
    .eq('is_active', true)
    .eq('platform', 'twitter');

  if (error) {
    console.error('[Pipeline] Error loading alerts:', error);
    return [];
  }

  return data ?? [];
}

interface TriggerContext {
  alert: SocialAlertRow;
  tweet: TweetData;
  matchedKeywords: string[];
  sentiment?: string;
  summary?: string;
}

async function persistTrigger({
  alert,
  tweet,
  matchedKeywords,
  sentiment,
  summary,
}: TriggerContext): Promise<void> {
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
      tweet_type: tweet.type,
      author: tweet.author.userName,
      matched_keywords: matchedKeywords,
    },
    triggered_at: new Date().toISOString(),
  });

  if (error) {
    console.error('[Pipeline] Error persisting trigger:', error);
  }
}

async function triggerAlert(context: TriggerContext): Promise<void> {
  const { alert, tweet, matchedKeywords, sentiment, summary } = context;
  await Promise.allSettled([
    persistTrigger(context),
    sendUnifiedAlert({
      userId: alert.user_id,
      alertType: 'social',
      alertId: alert.id,
      message: `@${tweet.author.userName} mentioned ${matchedKeywords.join(', ')}`,
      data: {
        account: tweet.author.userName,
        keywords: matchedKeywords,
        tweet_url: tweet.url,
        tweet_type: tweet.type,
        content: tweet.text,
        sentiment,
        summary,
      },
    }),
  ]);
}

// --- Main entry point ---

/**
 * Dedup (memory) -> claim (DB) -> match per account -> analyze -> sentiment filter -> trigger.
 *
 * In prod: called by the stream provider with no deps.
 * In dev/test: pass `deps` to inject alerts, a log-only trigger and skip the DB claim.
 */
export async function processTweets(
  tweets: TweetData[],
  deps?: PipelineDeps
): Promise<ProcessingResult> {
  let fresh = dedup(tweets);
  if (fresh.length === 0) {
    return { processed: 0, matched: 0, triggered: 0 };
  }

  if (!deps?.skipPersistence) {
    fresh = await claimTweets(fresh);
    if (fresh.length === 0) {
      return { processed: 0, matched: 0, triggered: 0 };
    }
  }

  const alerts = deps ? deps.alerts : await fetchActiveAlerts();

  if (!deps?.skipPersistence) {
    // Every claimed post was billed by X: count it for each user watching the author.
    recordDeliveredUsage(fresh, alerts).catch((error) => {
      console.error('[Pipeline] Usage accounting failed:', error);
    });
  }

  const matches = findMatches(alerts, fresh);

  if (matches.length === 0) {
    return { processed: fresh.length, matched: 0, triggered: 0 };
  }

  console.warn(`[Pipeline] ${matches.length} match(es) on ${fresh.length} tweet(s)`);

  const analyzed = await analyzeMatches(matches);
  const filtered = filterBySentiment(analyzed);

  const onTrigger = deps?.onTrigger;
  const results = await Promise.allSettled(
    filtered.map(({ alert, tweet, matchedKeywords, sentiment, summary }) =>
      onTrigger
        ? onTrigger(alert, tweet)
        : triggerAlert({ alert, tweet, matchedKeywords, sentiment, summary })
    )
  );

  const triggered = results.filter((r) => r.status === 'fulfilled').length;

  return { processed: fresh.length, matched: matches.length, triggered, matches: filtered };
}
