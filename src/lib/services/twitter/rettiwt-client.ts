import { Rettiwt, type Tweet as RettiwtTweet } from 'rettiwt-api';
import type { TweetData } from './types';

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

class RettiwtClient {
  private instance: Rettiwt | null = null;
  private userIdCache = new Map<string, string>();

  getRettiwt(): Rettiwt {
    if (!this.instance) {
      this.instance = new Rettiwt({ apiKey: requireApiKey() });
    }
    return this.instance;
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
        return user.id;
      }
    } catch (error) {
      console.error(`[RettiwtClient] Failed to resolve @${username}:`, error);
    }
    return null;
  }

  async fetchUserTweets(userId: string, count = 20): Promise<RettiwtTweet[]> {
    const result = await this.getRettiwt().user.timeline(userId, count);
    return result.list;
  }
}

export const rettiwtClient = new RettiwtClient();
