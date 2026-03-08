import { apifyClient, type Tweet } from './apify-client';
import { apifyWebhookManager } from './webhook-manager';
import { processTweets, fetchActiveAlerts } from '@/lib/services/twitter/pipeline';
import type { TweetData, SocialAlertRow } from '@/lib/services/twitter/types';

function shouldUseApify(): boolean {
  return process.env.TWITTER_PROVIDER === 'apify' || !process.env.TWITTER_PROVIDER;
}

// --- Apify Tweet → TweetData normalization ---

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

// --- Helpers for SocialMonitor state management ---

function groupAlertsByAccount(alerts: SocialAlertRow[]): Map<string, SocialAlertRow[]> {
  const grouped = new Map<string, SocialAlertRow[]>();

  for (const alert of alerts) {
    const account = alert.platform === 'twitter' ? 'twitter' : alert.platform;
    const existing = grouped.get(account) || [];
    existing.push(alert);
    grouped.set(account, existing);
  }

  return grouped;
}

// --- Class (stateful orchestrator) ---

export class SocialMonitor {
  private activeAlerts = new Map<string, SocialAlertRow[]>();
  private webhookId: string | null = null;
  private isMonitoring = false;

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.warn('Social monitoring already running');
      return;
    }

    // Delegate to twitter monitor if not using Apify
    if (!shouldUseApify()) {
      const { twitterMonitor } = await import('@/lib/services/twitter');
      await twitterMonitor.startMonitoring();
      this.isMonitoring = true;
      return;
    }

    console.warn('Starting social monitoring with webhooks...');
    this.isMonitoring = true;

    // These are independent — run in parallel
    await Promise.all([
      this.loadActiveAlerts(),
      this.setupWebhook(),
    ]);

    console.warn('Social monitoring started with webhooks');
  }

  async stopMonitoring(): Promise<void> {
    // Delegate to twitter monitor if not using Apify
    if (!shouldUseApify()) {
      const { twitterMonitor } = await import('@/lib/services/twitter');
      await twitterMonitor.stopMonitoring();
      this.isMonitoring = false;
      return;
    }

    if (this.webhookId) {
      try {
        await apifyWebhookManager.deleteWebhook(this.webhookId);
        this.webhookId = null;
      } catch (error) {
        console.error('Error deleting webhook:', error);
      }
    }

    this.isMonitoring = false;
    console.warn('Social monitoring stopped');
  }

  private async loadActiveAlerts(): Promise<void> {
    const alerts = await fetchActiveAlerts();
    this.activeAlerts = groupAlertsByAccount(alerts);
    console.warn(`Loaded ${alerts.length} active social alerts`);
  }

  private async setupWebhook(): Promise<void> {
    try {
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/apify`;

      this.webhookId = await apifyWebhookManager.createWebhook({
        eventTypes: ['ACTOR.RUN.SUCCEEDED'] as const,
        requestUrl: webhookUrl,
        isEnabled: true,
        condition: 'actorId=="apnow/twitter-user-tweets-scraper"',
      });
      console.warn('Webhook created for real-time monitoring:', this.webhookId);
    } catch (error) {
      console.error('Failed to setup webhook:', error);
      throw error;
    }
  }

  private async checkAllAlerts(): Promise<void> {
    if (this.activeAlerts.size === 0) {
      return;
    }

    console.warn(`Checking ${this.activeAlerts.size} accounts for alerts...`);

    const accounts = [...this.activeAlerts.keys()];
    const batchSize = 5;

    for (let i = 0; i < accounts.length; i += batchSize) {
      const batch = accounts.slice(i, i + batchSize);

      try {
        const results = await apifyClient.runBatchTwitterUserTweetsScraper(batch);

        // Normalize all tweets and process through shared pipeline
        for (const [, tweets] of results.entries()) {
          const normalized = tweets.map((t) => normalizeApifyTweet(t));
          await processTweets(normalized);
        }
      } catch (error) {
        console.error(`Error processing batch for accounts ${batch.join(', ')}:`, error);
      }

      if (i + batchSize < accounts.length) {
        await new Promise((resolve) => {
          setTimeout(resolve, 1000);
        });
      }
    }
  }

  async refreshAlerts(): Promise<void> {
    if (!shouldUseApify()) {
      const { twitterMonitor } = await import('@/lib/services/twitter');
      await twitterMonitor.refreshAlerts();
      return;
    }
    await this.loadActiveAlerts();
  }

  getStatus(): { isMonitoring: boolean; activeAccounts: number; totalAlerts: number } {
    const totalAlerts = [...this.activeAlerts.values()].reduce(
      (sum, alerts) => sum + alerts.length,
      0
    );

    return {
      isMonitoring: this.isMonitoring,
      activeAccounts: this.activeAlerts.size,
      totalAlerts,
    };
  }
}

export const socialMonitor = new SocialMonitor();
