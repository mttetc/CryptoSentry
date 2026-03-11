import { Rettiwt, type Tweet as RettiwtTweet } from 'rettiwt-api';
import type { TweetData } from './types';

const INITIAL_BACKOFF_MS = 60_000; // 1 minute
const MAX_BACKOFF_MS = 600_000; // 10 minutes
const TWEET_CACHE_TTL_MS = 30_000; // 30 seconds

function requireApiKey(): string {
  const key = process.env.RETTIWT_API_KEY;
  if (!key) {
    throw new Error('RETTIWT_API_KEY env var is required');
  }
  return key;
}

export function normalizeRettiwtTweet(tweet: RettiwtTweet): TweetData {
  return {
    id: tweet.id,
    text: tweet.fullText,
    author: {
      userName: tweet.tweetBy.userName,
      displayName: tweet.tweetBy.fullName,
    },
    createdAt: tweet.createdAt,
    url: `https://x.com/${tweet.tweetBy.userName}/status/${tweet.id}`,
    engagement: {
      likes: tweet.likeCount,
      retweets: tweet.retweetCount,
      replies: tweet.replyCount,
    },
  };
}

interface CachedTweets {
  tweets: RettiwtTweet[];
  cachedAt: number;
}

class RettiwtClient {
  private instance: Rettiwt | null = null;
  private userIdCache = new Map<string, string>();

  // Rate limit backoff per username
  private backoffUntil = new Map<string, number>();
  private backoffDuration = new Map<string, number>();

  // Short-lived tweet cache per userId
  private tweetCache = new Map<string, CachedTweets>();

  getRettiwt(): Rettiwt {
    if (!this.instance) {
      this.instance = new Rettiwt({ apiKey: requireApiKey() });
    }
    return this.instance;
  }

  isBackedOff(username: string): boolean {
    const until = this.backoffUntil.get(username.toLowerCase());
    if (!until) {
      return false;
    }
    if (Date.now() >= until) {
      this.backoffUntil.delete(username.toLowerCase());
      return false;
    }
    return true;
  }

  private applyBackoff(username: string): void {
    const key = username.toLowerCase();
    const current = this.backoffDuration.get(key) ?? INITIAL_BACKOFF_MS;
    const nextBackoff = Math.min(current * 2, MAX_BACKOFF_MS);

    this.backoffUntil.set(key, Date.now() + current);
    this.backoffDuration.set(key, nextBackoff);

    console.warn(`[RettiwtClient] Rate limited @${username}, backing off ${current}ms`);
  }

  private clearBackoff(username: string): void {
    const key = username.toLowerCase();
    this.backoffDuration.delete(key);
  }

  async resolveUserId(username: string): Promise<string | null> {
    const cached = this.userIdCache.get(username.toLowerCase());
    if (cached) {
      return cached;
    }

    try {
      const user = await this.getRettiwt().user.details(username);
      if (user) {
        this.userIdCache.set(username.toLowerCase(), user.id);
        this.clearBackoff(username);
        return user.id;
      }
    } catch (error) {
      if (isRateLimitError(error)) {
        this.applyBackoff(username);
      }
      console.error(`[RettiwtClient] Failed to resolve @${username}:`, error);
    }
    return null;
  }

  async fetchUserTweets(userId: string, count = 20): Promise<RettiwtTweet[]> {
    // Check cache first
    const cached = this.tweetCache.get(userId);
    if (cached && Date.now() - cached.cachedAt < TWEET_CACHE_TTL_MS) {
      return cached.tweets;
    }

    try {
      const result = await this.getRettiwt().user.timeline(userId, count);
      const tweets = result.list;

      // Cache the result
      this.tweetCache.set(userId, { tweets, cachedAt: Date.now() });

      // Evict stale cache entries periodically
      if (this.tweetCache.size > 200) {
        const now = Date.now();
        for (const [key, entry] of this.tweetCache) {
          if (now - entry.cachedAt > TWEET_CACHE_TTL_MS) {
            this.tweetCache.delete(key);
          }
        }
      }

      return tweets;
    } catch (error) {
      if (isRateLimitError(error)) {
        // Find username for this userId to apply backoff
        for (const [name, id] of this.userIdCache) {
          if (id === userId) {
            this.applyBackoff(name);
            break;
          }
        }
      }
      throw error;
    }
  }
}

function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('rate limit') || msg.includes('429') || msg.includes('too many');
  }
  return false;
}

export const rettiwtClient = new RettiwtClient();
