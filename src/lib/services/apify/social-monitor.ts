import { apifyClient, type Tweet } from './apify-client';
import { processTweets, fetchActiveAlerts } from '@/lib/services/twitter/pipeline';
import type { TweetData, SocialAlertRow } from '@/lib/services/twitter/types';

const DEFAULT_POLL_INTERVAL_MS = 60_000;
const ALERT_REFRESH_INTERVAL = 5; // Refresh alerts from DB every N polls

function normalizeApifyTweet(tweet: Tweet): TweetData {
  return {
    id: tweet.id,
    text: tweet.text,
    author: tweet.author,
    createdAt: tweet.createdAt,
    url: tweet.url,
    engagement: {
      likes: tweet.likesCount ?? 0,
      retweets: tweet.retweetsCount ?? 0,
      replies: tweet.repliesCount ?? 0,
    },
  };
}

export class SocialMonitor {
  private alerts: SocialAlertRow[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isMonitoring = false;
  private pollCount = 0;

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.warn('[SocialMonitor] Already running');
      return;
    }

    this.alerts = await fetchActiveAlerts();
    this.isMonitoring = true;

    // Poll immediately, then on interval
    await this.poll();

    const interval = Number(process.env.APIFY_POLL_INTERVAL_MS) || DEFAULT_POLL_INTERVAL_MS;
    this.intervalId = setInterval(() => {
      this.poll().catch((error) => {
        console.error('[SocialMonitor] Poll error:', error);
      });
    }, interval);

    console.warn(`[SocialMonitor] Started polling every ${interval}ms for ${this.alerts.length} alerts`);
  }

  async stopMonitoring(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isMonitoring = false;
    console.warn('[SocialMonitor] Stopped');
  }

  async refreshAlerts(): Promise<void> {
    this.alerts = await fetchActiveAlerts();
    console.warn(`[SocialMonitor] Refreshed: ${this.alerts.length} alerts`);
  }

  getStatus(): { isMonitoring: boolean; activeAccounts: number; totalAlerts: number } {
    const twitterAlerts = this.alerts.filter((a) => a.platform === 'twitter');
    const accounts = new Set(twitterAlerts.map((a) => a.account));

    return {
      isMonitoring: this.isMonitoring,
      activeAccounts: accounts.size,
      totalAlerts: twitterAlerts.length,
    };
  }

  private async poll(): Promise<void> {
    this.pollCount++;

    // Periodically refresh alerts from DB (picks up new/deleted alerts)
    if (this.pollCount % ALERT_REFRESH_INTERVAL === 0) {
      await this.refreshAlerts();
    }

    const twitterAlerts = this.alerts.filter((a) => a.platform === 'twitter');
    if (twitterAlerts.length === 0) {
      return;
    }

    // Deduplicate accounts — multiple alerts on same account = 1 Apify call
    const accounts = [...new Set(twitterAlerts.map((a) => a.account))];
    console.warn(`[SocialMonitor] Polling ${accounts.length} unique accounts (${twitterAlerts.length} alerts)...`);

    try {
      // Single batch call to Apify for all accounts
      const results = await apifyClient.runBatchTwitterUserTweetsScraper(accounts);

      // Process all tweets through the shared pipeline (dedup + match + trigger)
      for (const [, tweets] of results.entries()) {
        const normalized = tweets.map((t) => normalizeApifyTweet(t));
        await processTweets(normalized);
      }
    } catch (error) {
      console.error('[SocialMonitor] Error polling:', error);
    }
  }
}

export const socialMonitor = new SocialMonitor();
