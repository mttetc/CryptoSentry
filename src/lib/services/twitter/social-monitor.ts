import { rettiwtClient, normalizeRettiwtTweet } from './rettiwt-client';
import { processTweets, fetchActiveAlerts } from './pipeline';
import type { SocialAlertRow } from './types';

const DEFAULT_POLL_INTERVAL_MS = 120_000; // 2 minutes
const ALERT_REFRESH_INTERVAL_MS = 600_000; // Refresh alerts every 10 min
const MIN_STAGGER_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

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
    const accounts = this.getUniqueAccountsSorted();
    return {
      isMonitoring: this.isMonitoring,
      activeAccounts: accounts.length,
      totalAlerts: this.alerts.filter((a) => a.platform === 'twitter').length,
    };
  }

  // Returns unique accounts sorted by priority (most-followed first)
  private getUniqueAccountsSorted(): string[] {
    const accountCounts = new Map<string, number>();
    for (const alert of this.alerts) {
      if (alert.platform === 'twitter') {
        accountCounts.set(alert.account, (accountCounts.get(alert.account) ?? 0) + 1);
      }
    }

    return [...accountCounts.entries()].toSorted((a, b) => b[1] - a[1]).map(([account]) => account);
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

    const accounts = this.getUniqueAccountsSorted();

    if (accounts.length === 0) {
      this.schedulePoll(10_000);
      return;
    }

    // Stagger polls: spread evenly across the interval, min 2s between each
    const staggerMs = Math.max(
      MIN_STAGGER_MS,
      Math.floor(DEFAULT_POLL_INTERVAL_MS / accounts.length)
    );

    console.warn(`[SocialMonitor] Polling ${accounts.length} accounts (${staggerMs}ms stagger)...`);

    for (const username of accounts) {
      if (!this.isMonitoring) {
        return;
      }

      // Skip if rate-limited for this account
      if (rettiwtClient.isBackedOff(username)) {
        console.warn(`[SocialMonitor] Skipping @${username} (rate-limited)`);
        continue;
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

      // Stagger: wait between accounts to avoid rate limiting
      if (accounts.indexOf(username) < accounts.length - 1) {
        await sleep(staggerMs);
      }
    }

    this.schedulePoll(DEFAULT_POLL_INTERVAL_MS);
  }
}

export const socialMonitor = new SocialMonitor();
