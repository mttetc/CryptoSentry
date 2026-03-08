// Apify client service

import { z } from 'zod';
import { requireApifyToken, APIFY_BASE_URL } from './config';

// Twitter User Tweets Scraper Actor ID
const TWITTER_USER_TWEETS_ACTOR_ID = 'apnow/twitter-user-tweets-scraper';

// Cache for storing recent tweets to avoid duplicate processing
const tweetCache = new Map<string, { tweets: Tweet[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const tweetSchema = z.object({
  id: z.string(),
  text: z.string(),
  author: z.object({
    userName: z.string(),
    displayName: z.string(),
  }),
  createdAt: z.string(),
  url: z.string(),
  likesCount: z.number().optional(),
  retweetsCount: z.number().optional(),
  repliesCount: z.number().optional(),
});

export type Tweet = z.infer<typeof tweetSchema>;

interface ApifyRunResponse {
  data: {
    id: string;
    status: string;
    defaultDatasetId: string;
  };
}

export class ApifyClient {
  private async makeRequest<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = requireApifyToken();
    const response = await fetch(`${APIFY_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Apify API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  async runTwitterUserTweetsScraper(username: string): Promise<Tweet[]> {
    // Check cache first
    const cached = tweetCache.get(username);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.tweets;
    }

    try {
      // Start the actor run
      const { data: run } = await this.makeRequest<ApifyRunResponse>(`/acts/${TWITTER_USER_TWEETS_ACTOR_ID}/runs`, {
        method: 'POST',
        body: JSON.stringify({
          input: {
            usernames: [username],
            maxTweets: 20,
            includeUserInfo: true,
            includeSearchTerms: false,
          },
        }),
      });

      // Wait for the run to complete (with timeout)
      const maxWaitTime = 60_000; // 1 minute
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        const { data: status } = await this.makeRequest<ApifyRunResponse>(
          `/acts/${TWITTER_USER_TWEETS_ACTOR_ID}/runs/${run.id}`
        );

        if (status.status === 'SUCCEEDED') {
          break;
        } else if (status.status === 'FAILED') {
          throw new Error('Apify run failed');
        }

        // Wait 2 seconds before checking again
        await new Promise((resolve) => { setTimeout(resolve, 2000); });
      }

      // Get the dataset
      const datasetItems = await this.makeRequest<unknown[]>(`/datasets/${run.defaultDatasetId}/items`);

      // Parse and validate tweets
      const tweets: Tweet[] = [];
      for (const item of datasetItems) {
        try {
          const tweet = tweetSchema.parse(item);
          tweets.push(tweet);
        } catch (error) {
          console.error('Error parsing tweet:', error);
        }
      }

      // Update cache
      tweetCache.set(username, {
        tweets,
        timestamp: Date.now(),
      });

      return tweets;
    } catch (error) {
      console.error('Error running Twitter scraper:', error);
      return [];
    }
  }

  // Cost optimization: batch multiple usernames in a single run
  async runBatchTwitterUserTweetsScraper(usernames: string[]): Promise<Map<string, Tweet[]>> {
    const results = new Map<string, Tweet[]>();

    try {
      const { data: run } = await this.makeRequest<ApifyRunResponse>(`/acts/${TWITTER_USER_TWEETS_ACTOR_ID}/runs`, {
        method: 'POST',
        body: JSON.stringify({
          input: {
            usernames,
            maxTweets: 20,
            includeUserInfo: true,
            includeSearchTerms: false,
          },
        }),
      });

      // Wait for completion
      const maxWaitTime = 120_000; // 2 minutes for batch
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        const { data: status } = await this.makeRequest<ApifyRunResponse>(
          `/acts/${TWITTER_USER_TWEETS_ACTOR_ID}/runs/${run.id}`
        );

        if (status.status === 'SUCCEEDED') {
          break;
        } else if (status.status === 'FAILED') {
          throw new Error('Apify batch run failed');
        }

        await new Promise((resolve) => { setTimeout(resolve, 3000); });
      }

      // Get the dataset
      const datasetItems = await this.makeRequest<unknown[]>(`/datasets/${run.defaultDatasetId}/items`);

      // Group tweets by username
      for (const item of datasetItems) {
        try {
          const tweet = tweetSchema.parse(item);
          const username = tweet.author.userName;

          if (!results.has(username)) {
            results.set(username, []);
          }
          results.get(username)?.push(tweet);
        } catch (error) {
          console.error('Error parsing tweet in batch:', error);
        }
      }

      // Update cache for each username
      for (const [username, tweets] of results) {
        tweetCache.set(username, {
          tweets,
          timestamp: Date.now(),
        });
      }

      return results;
    } catch (error) {
      console.error('Error running batch Twitter scraper:', error);
      return results;
    }
  }

  // Clear cache (useful for testing or manual cache invalidation)
  clearCache(): void {
    tweetCache.clear();
  }

  // Get cache stats for monitoring
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: tweetCache.size,
      entries: [...tweetCache.keys()],
    };
  }
}

// Singleton instance
export const apifyClient = new ApifyClient();
