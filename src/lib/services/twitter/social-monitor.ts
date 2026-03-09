import { rettiwtClient, normalizeRettiwtTweet } from './rettiwt-client';
import { processTweets, fetchActiveAlerts } from './pipeline';
import type { SocialAlertRow } from './types';

const DEFAULT_POLL_INTERVAL_MS = 120_000; // 2 minutes
const ALERT_REFRESH_INTERVAL_MS = 600_000; // Refresh alerts every 10 min

export class SocialMonitor {
  private alerts: SocialAlertRow[] = [];
  private isMonitoring = false;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      return;
    }

    this.alerts = await fetchActiveAlerts();
    this.isMonitoring = true;

    this.refreshTimer = setInterval(() => {
      this.refreshAlerts().catch(console.error);
    }, ALERT_REFRESH_INTERVAL_MS);

    this.schedulePoll(0);
    console.warn(`[SocialMonitor] Started with ${this.alerts.length} alerts`);
  }

  async stopMonitoring(): Promise<void> {
    this.isMonitoring = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    console.warn('[SocialMonitor] Stopped');
  }

  async refreshAlerts(): Promise<void> {
    this.alerts = await fetchActiveAlerts();
  }

  getStatus() {
    const accounts = this.getUniqueAccounts();
    return {
      isMonitoring: this.isMonitoring,
      activeAccounts: accounts.length,
      totalAlerts: this.alerts.filter((a) => a.platform === 'twitter').length,
    };
  }

  private getUniqueAccounts(): string[] {
    return [
      ...new Set(this.alerts.filter((a) => a.platform === 'twitter').map((a) => a.account)),
    ].toSorted();
  }

  private schedulePoll(delayMs: number): void {
    if (!this.isMonitoring) {
      return;
    }
    this.pollTimer = setTimeout(() => {
      this.pollAllAccounts().catch(console.error);
    }, delayMs);
  }

  private async pollAllAccounts(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    const accounts = this.getUniqueAccounts();
    const interval = DEFAULT_POLL_INTERVAL_MS;

    if (accounts.length === 0) {
      this.schedulePoll(10_000);
      return;
    }

    console.warn(`[SocialMonitor] Polling ${accounts.length} accounts...`);

    for (const username of accounts) {
      if (!this.isMonitoring) {
        return;
      }

      try {
        const userId = await rettiwtClient.resolveUserId(username);
        if (!userId) {
          console.warn(`[SocialMonitor] Could not resolve @${username}, skipping`);
          continue;
        }

        const tweets = await rettiwtClient.fetchUserTweets(userId, 10);
        if (tweets.length > 0) {
          const normalized = tweets.map((t) => normalizeRettiwtTweet(t));
          await processTweets(normalized);
        }
      } catch (error) {
        console.error(`[SocialMonitor] Error polling @${username}:`, error);
      }
    }

    this.schedulePoll(interval);
  }
}

export const socialMonitor = new SocialMonitor();
