'use server';

import { z } from 'zod';

const APIFY_BASE_URL = 'https://api.apify.com/v2';
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

if (!APIFY_API_TOKEN) {
  throw new Error('APIFY_API_TOKEN environment variable is required');
}

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

interface ApifyRun {
  id: string;
  status: string;
  defaultDatasetId: string;
}

interface ApifyDataset {
  items: Tweet[];
}

export class ApifyClient {
  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${APIFY_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${APIFY_API_TOKEN}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Apify API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async runTwitterUserTweetsScraper(username: string): Promise<Tweet[]> {
    // Check cache first
    const cached = tweetCache.get(username);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.tweets;
    }

    try {
      // Start the actor run
      const runResponse = await this.makeRequest(`/acts/${TWITTER_USER_TWEETS_ACTOR_ID}/runs`, {
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

      const run: ApifyRun = runResponse.data;

      // Wait for the run to complete (with timeout)
      const maxWaitTime = 60000; // 1 minute
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        const statusResponse = await this.makeRequest(
          `/acts/${TWITTER_USER_TWEETS_ACTOR_ID}/runs/${run.id}`
        );

        if (statusResponse.data.status === 'SUCCEEDED') {
          break;
        } else if (statusResponse.data.status === 'FAILED') {
          throw new Error('Apify run failed');
        }

        // Wait 2 seconds before checking again
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Get the dataset
      const datasetResponse = await this.makeRequest(`/datasets/${run.defaultDatasetId}/items`);
      const dataset: ApifyDataset = datasetResponse;

      // Parse and validate tweets
      const tweets: Tweet[] = [];
      for (const item of dataset.items) {
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
      const runResponse = await this.makeRequest(`/acts/${TWITTER_USER_TWEETS_ACTOR_ID}/runs`, {
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

      const run: ApifyRun = runResponse.data;

      // Wait for completion
      const maxWaitTime = 120000; // 2 minutes for batch
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        const statusResponse = await this.makeRequest(
          `/acts/${TWITTER_USER_TWEETS_ACTOR_ID}/runs/${run.id}`
        );

        if (statusResponse.data.status === 'SUCCEEDED') {
          break;
        } else if (statusResponse.data.status === 'FAILED') {
          throw new Error('Apify batch run failed');
        }

        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      // Get the dataset
      const datasetResponse = await this.makeRequest(`/datasets/${run.defaultDatasetId}/items`);
      const dataset: ApifyDataset = datasetResponse;

      // Group tweets by username
      for (const item of dataset.items) {
        try {
          const tweet = tweetSchema.parse(item);
          const username = tweet.author.userName;

          if (!results.has(username)) {
            results.set(username, []);
          }
          results.get(username)!.push(tweet);
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
      entries: Array.from(tweetCache.keys()),
    };
  }
}

// Singleton instance
export const apifyClient = new ApifyClient();
