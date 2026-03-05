// Social monitor service - Now using webhooks for real-time monitoring

import { apifyClient, type Tweet } from './apify-client';
import { apifyWebhookManager } from './webhook-manager';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { broadcastUpdate } from '@/actions/monitor/lib/realtime';
import { sendUnifiedAlert } from '@/actions/messaging/unified-notifications';
import type { SocialAlert } from '@/types/alerts';

interface AlertTrigger {
  alert_id: string;
  triggered_at: string;
  content: string;
  tweet_url: string;
  tweet_id: string;
  author: string;
  engagement: {
    likes: number;
    retweets: number;
    replies: number;
  };
}

export class SocialMonitor {
  private activeAlerts: Map<string, SocialAlert[]> = new Map();
  private webhookId: string | null = null;
  private isMonitoring = false;

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.warn('Social monitoring already running');
      return;
    }

    console.warn('Starting social monitoring with webhooks...');
    this.isMonitoring = true;

    // Load active alerts
    await this.loadActiveAlerts();

    // Create webhook for real-time monitoring
    await this.setupWebhook();

    console.warn('Social monitoring started with webhooks');
  }

  async stopMonitoring(): Promise<void> {
    // Clean up webhook
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
    try {
      const supabase = await createServerSupabaseClient();

      const { data: alerts, error } = await supabase
        .from('social_alerts')
        .select('*')
        .eq('active', true);

      if (error) {
        console.error('Error loading active alerts:', error);
        return;
      }

      // Group alerts by account for batch processing
      const alertsByAccount = new Map<string, SocialAlert[]>();

      for (const alert of alerts || []) {
        const account = alert.platform === 'twitter' ? 'twitter' : alert.platform;

        if (!alertsByAccount.has(account)) {
          alertsByAccount.set(account, []);
        }
        alertsByAccount.get(account)!.push(alert);
      }

      this.activeAlerts = alertsByAccount;
      console.warn(`Loaded ${alerts?.length || 0} active social alerts`);
    } catch (error) {
      console.error('Error loading active alerts:', error);
    }
  }

  private async setupWebhook(): Promise<void> {
    try {
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/apify`;

      const webhookConfig = {
        eventTypes: ['ACTOR.RUN.SUCCEEDED'] as const,
        requestUrl: webhookUrl,
        isEnabled: true,
        condition: 'actorId=="apnow/twitter-user-tweets-scraper"',
      };

      this.webhookId = await apifyWebhookManager.createWebhook(webhookConfig);
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

    // Get all unique accounts
    const accounts = Array.from(this.activeAlerts.keys());

    // Process in batches to avoid overwhelming Apify
    const batchSize = 5;
    for (let i = 0; i < accounts.length; i += batchSize) {
      const batch = accounts.slice(i, i + batchSize);

      try {
        // Use batch processing for cost optimization
        const results = await apifyClient.runBatchTwitterUserTweetsScraper(batch);

        for (const [account, tweets] of results) {
          await this.processTweetsForAccount(account, tweets);
        }
      } catch (error) {
        console.error(`Error processing batch for accounts ${batch.join(', ')}:`, error);
      }

      // Small delay between batches to be respectful to Apify
      if (i + batchSize < accounts.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  private async processTweetsForAccount(account: string, tweets: Tweet[]): Promise<void> {
    const alerts = this.activeAlerts.get(account);
    if (!alerts || alerts.length === 0) {
      return;
    }

    console.warn(`Processing ${tweets.length} tweets for @${account}`);

    for (const tweet of tweets) {
      for (const alert of alerts) {
        const hasMatchingKeywords = alert.keywords.some((keyword) =>
          tweet.text.toLowerCase().includes(keyword.toLowerCase())
        );

        if (hasMatchingKeywords) {
          await this.triggerAlert(alert, tweet);
        }
      }
    }
  }

  private async triggerAlert(alert: SocialAlert, tweet: Tweet): Promise<void> {
    try {
      const supabase = await createServerSupabaseClient();

      // Record the trigger
      const triggerData: AlertTrigger = {
        alert_id: alert.id,
        triggered_at: new Date().toISOString(),
        content: tweet.text,
        tweet_url: tweet.url,
        tweet_id: tweet.id,
        author: tweet.author.userName,
        engagement: {
          likes: tweet.likesCount || 0,
          retweets: tweet.retweetsCount || 0,
          replies: tweet.repliesCount || 0,
        },
      };

      const { error: triggerError } = await supabase.from('alert_triggers').insert(triggerData);

      if (triggerError) {
        console.error('Error recording alert trigger:', triggerError);
        return;
      }

      // Send SSE event to connected clients
      await broadcastUpdate('social', {
        platform: alert.platform,
        account: alert.platform,
        content: tweet.text,
        keywords: alert.keywords,
        tweet_url: tweet.url,
        author: tweet.author.userName,
        engagement: triggerData.engagement,
        timestamp: Date.now(),
      });

      // Send Telegram alert
      await sendUnifiedAlert({
        userId: alert.user_id,
        alertType: 'social',
        message: `Social Alert: ${alert.platform} mentioned your keywords`,
        data: {
          account: alert.platform,
          keywords: alert.keywords,
          tweet_url: tweet.url,
        },
      });

      console.warn(`Alert triggered for ${alert.platform}: "${tweet.text.substring(0, 50)}..."`);
    } catch (error) {
      console.error('Error triggering alert:', error);
    }
  }

  // Method to manually refresh alerts (useful when new alerts are added)
  async refreshAlerts(): Promise<void> {
    await this.loadActiveAlerts();
  }

  // Get monitoring status
  getStatus(): { isMonitoring: boolean; activeAccounts: number; totalAlerts: number } {
    const totalAlerts = Array.from(this.activeAlerts.values()).reduce(
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

// Singleton instance
export const socialMonitor = new SocialMonitor();
