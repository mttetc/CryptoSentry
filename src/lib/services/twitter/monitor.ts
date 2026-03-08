import { createTweetProvider } from './factory';
import type { TweetProvider, SocialAlertRow } from './types';
import { processTweets, fetchActiveAlerts, clearDedupCache } from './pipeline';

export class TwitterMonitor {
  private provider: TweetProvider | null = null;
  private alerts: SocialAlertRow[] = [];
  private isRunning = false;

  async startMonitoring(): Promise<void> {
    if (this.isRunning) {
      console.warn('[TwitterMonitor] Already running');
      return;
    }

    this.alerts = await fetchActiveAlerts();

    const twitterAlerts = this.alerts.filter((a) => a.platform === 'twitter');
    const accountNames = [...new Set(twitterAlerts.map((a) => a.account).filter(Boolean))];
    const keywords = [...new Set(twitterAlerts.flatMap((a) => a.keywords))];

    this.provider = createTweetProvider();

    this.provider.onTweets((tweets) => {
      processTweets(tweets).catch((error) => {
        console.error('[TwitterMonitor] Error handling tweets:', error);
      });
    });

    await this.provider.start({
      usernames: accountNames,
      keywords,
    });

    this.isRunning = true;
    console.warn(`[TwitterMonitor] Started with ${twitterAlerts.length} alerts, ${accountNames.length} accounts`);
  }

  async stopMonitoring(): Promise<void> {
    if (this.provider) {
      await this.provider.stop();
      this.provider = null;
    }
    this.isRunning = false;
    clearDedupCache();
    console.warn('[TwitterMonitor] Stopped');
  }

  async refreshAlerts(): Promise<void> {
    this.alerts = await fetchActiveAlerts();
    console.warn(`[TwitterMonitor] Refreshed: ${this.alerts.length} alerts`);
  }

  getStatus(): { isMonitoring: boolean; activeAccounts: number; totalAlerts: number } {
    const twitterAlerts = this.alerts.filter((a) => a.platform === 'twitter');
    const accounts = new Set(twitterAlerts.map((a) => a.account).filter(Boolean));

    return {
      isMonitoring: this.isRunning,
      activeAccounts: accounts.size,
      totalAlerts: twitterAlerts.length,
    };
  }
}

export const twitterMonitor = new TwitterMonitor();
