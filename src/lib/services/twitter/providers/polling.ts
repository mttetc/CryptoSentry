import { Rettiwt } from 'rettiwt-api';
import type { TweetProvider, TweetProviderConfig, TweetCallback, TweetData } from '../types';

const DEFAULT_POLL_INTERVAL_MS = 60_000;
const BATCH_SIZE = 5;

export class PollingProvider implements TweetProvider {
  private rettiwt: Rettiwt | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private callback: TweetCallback | null = null;
  private config: TweetProviderConfig | null = null;

  async start(config: TweetProviderConfig): Promise<void> {
    const cookies = process.env.TWITTER_COOKIES;
    if (!cookies) {
      throw new Error('TWITTER_COOKIES env var is required for polling provider');
    }

    this.rettiwt = new Rettiwt({ apiKey: cookies });
    this.config = config;

    // Run immediately, then on interval
    await this.poll();

    const interval = Number(process.env.TWITTER_POLL_INTERVAL_MS) || DEFAULT_POLL_INTERVAL_MS;
    this.intervalId = setInterval(() => {
      this.poll().catch((error) => {
        console.error('[PollingProvider] Poll cycle error:', error);
      });
    }, interval);

    console.warn(`[PollingProvider] Started polling every ${interval}ms for ${config.usernames.length} accounts`);
  }

  async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.rettiwt = null;
    this.config = null;
    console.warn('[PollingProvider] Stopped');
  }

  onTweets(callback: TweetCallback): void {
    this.callback = callback;
  }

  private async poll(): Promise<void> {
    if (!this.rettiwt || !this.config || !this.callback) {
      return;
    }

    const { usernames } = this.config;
    const allTweets: TweetData[] = [];

    // Process in batches
    for (let i = 0; i < usernames.length; i += BATCH_SIZE) {
      const batch = usernames.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map((username) => this.fetchUserTweets(username))
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          allTweets.push(...result.value);
        }
      }

      // Rate limit pause between batches
      if (i + BATCH_SIZE < usernames.length) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 2000);
        });
      }
    }

    if (allTweets.length > 0) {
      this.callback(allTweets);
    }
  }

  private async fetchUserTweets(username: string): Promise<TweetData[]> {
    if (!this.rettiwt) {
      return [];
    }

    try {
      const response = await this.rettiwt.tweet.search({
        fromUsers: [username],
      }, 20);

      return (response.list || []).map((tweet): TweetData => ({
        id: tweet.id,
        text: tweet.fullText,
        author: {
          userName: tweet.tweetBy?.userName ?? username,
          displayName: tweet.tweetBy?.fullName ?? username,
        },
        createdAt: tweet.createdAt ? new Date(tweet.createdAt).toISOString() : new Date().toISOString(),
        url: `https://x.com/${tweet.tweetBy?.userName ?? username}/status/${tweet.id}`,
        engagement: {
          likes: tweet.likeCount ?? 0,
          retweets: tweet.retweetCount ?? 0,
          replies: tweet.replyCount ?? 0,
        },
      }));
    } catch (error) {
      console.error(`[PollingProvider] Error fetching tweets for @${username}:`, error);
      return [];
    }
  }
}
