import { apifyClient, type Tweet } from './apify-client';
import { apifyWebhookManager } from './webhook-manager';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { broadcastUpdate } from '@/actions/monitor/lib/realtime';
import { sendUnifiedAlert } from '@/actions/messaging/unified-notifications';
import type { SocialAlert } from '@/types/alerts';

// --- Pure functions ---

interface KeywordIndex {
  keyword: string;
  alert: SocialAlert;
}

/**
 * Build a keyword index: O(m × k) where m=alerts, k=avg keywords per alert.
 * Eliminates the need for nested tweet × alert loops.
 */
function buildKeywordIndex(alerts: SocialAlert[]): KeywordIndex[] {
  return alerts.flatMap((alert) =>
    alert.keywords.map((keyword) => ({
      keyword: keyword.toLowerCase(),
      alert,
    }))
  );
}

function groupAlertsByAccount(alerts: SocialAlert[]): Map<string, SocialAlert[]> {
  const grouped = new Map<string, SocialAlert[]>();

  for (const alert of alerts) {
    const account = alert.platform === 'twitter' ? 'twitter' : alert.platform;
    const existing = grouped.get(account) || [];
    existing.push(alert);
    grouped.set(account, existing);
  }

  return grouped;
}

function buildEngagement(tweet: Tweet) {
  return {
    likes: tweet.likesCount || 0,
    retweets: tweet.retweetsCount || 0,
    replies: tweet.repliesCount || 0,
  };
}

function buildTriggerData(alert: SocialAlert, tweet: Tweet) {
  return {
    alert_id: alert.id,
    triggered_at: new Date().toISOString(),
    content: tweet.text,
    tweet_url: tweet.url,
    tweet_id: tweet.id,
    author: tweet.author.userName,
    engagement: buildEngagement(tweet),
  };
}

function buildBroadcastData(alert: SocialAlert, tweet: Tweet): Record<string, unknown> {
  return {
    platform: alert.platform,
    account: alert.platform,
    content: tweet.text,
    keywords: alert.keywords,
    tweet_url: tweet.url,
    author: tweet.author.userName,
    engagement: buildEngagement(tweet),
    timestamp: Date.now(),
  };
}

function buildNotification(alert: SocialAlert, tweet: Tweet) {
  return {
    userId: alert.user_id,
    alertType: 'social' as const,
    message: `Social Alert: ${alert.platform} mentioned your keywords`,
    data: {
      account: alert.platform,
      keywords: alert.keywords,
      tweet_url: tweet.url,
    },
  };
}

/**
 * O(n × k) instead of O(n × m × k):
 * - Build keyword index once: O(m × k)
 * - For each tweet: lowercase once, scan keywords: O(k total unique)
 * - Use Set to deduplicate alert matches per tweet
 */
function findMatchingPairs(
  alerts: SocialAlert[],
  tweets: Tweet[]
): { alert: SocialAlert; tweet: Tweet }[] {
  const index = buildKeywordIndex(alerts);
  const matches: { alert: SocialAlert; tweet: Tweet }[] = [];

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

// --- Single-responsibility I/O ---

async function fetchActiveAlertsFromDB(): Promise<SocialAlert[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('social_alerts')
    .select('*')
    .eq('active', true);

  if (error) {
    console.error('Error loading active alerts:', error);
    return [];
  }

  return data || [];
}

async function persistTrigger(data: Record<string, unknown>): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from('alert_triggers').insert(data);

  if (error) {
    console.error('Error recording alert trigger:', error);
    return false;
  }

  return true;
}

async function triggerSingleAlert(alert: SocialAlert, tweet: Tweet): Promise<void> {
  const triggerData = buildTriggerData(alert, tweet);
  const broadcastData = buildBroadcastData(alert, tweet);
  const notification = buildNotification(alert, tweet);

  // All three operations are independent — run in parallel
  await Promise.allSettled([
    persistTrigger(triggerData),
    broadcastUpdate('social', broadcastData),
    sendUnifiedAlert(notification),
  ]);
}

// --- Class (stateful orchestrator) ---

export class SocialMonitor {
  private activeAlerts = new Map<string, SocialAlert[]>();
  private webhookId: string | null = null;
  private isMonitoring = false;

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.warn('Social monitoring already running');
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
    const alerts = await fetchActiveAlertsFromDB();
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

        // Process all accounts in this batch in parallel
        await Promise.allSettled(
          [...results.entries()].map(([account, tweets]) =>
            this.processTweetsForAccount(account, tweets)
          )
        );
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

  private async processTweetsForAccount(account: string, tweets: Tweet[]): Promise<void> {
    const alerts = this.activeAlerts.get(account);
    if (!alerts || alerts.length === 0) {
      return;
    }

    // Pure: find all matches
    const matches = findMatchingPairs(alerts, tweets);

    // I/O: trigger all matches in parallel
    await Promise.allSettled(
      matches.map(({ alert, tweet }) => triggerSingleAlert(alert, tweet))
    );
  }

  async refreshAlerts(): Promise<void> {
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
