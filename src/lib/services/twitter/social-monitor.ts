import { processTweets, fetchActiveAlerts, pruneProcessedTweets } from './pipeline';
import { XFilteredStreamProvider, readXStreamConfig } from './providers/x-filtered-stream';
import { getUsersOverTweetQuota } from '@/lib/config/plans';
import type { SocialAlertRow, TweetProvider } from './types';

const ALERT_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const REFRESH_DEBOUNCE_MS = 2000;

/**
 * Orchestrates the push-based tweet provider: loads active alerts, drops users over their monthly
 * quota, syncs the provider's server-side rules, and feeds delivered tweets to the pipeline.
 */
export class SocialMonitor {
  private provider: TweetProvider | null = null;
  private alerts: SocialAlertRow[] = [];
  private eligibleAlerts: SocialAlertRow[] = [];
  private isMonitoring = false;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshing: Promise<void> | null = null;
  private refreshQueued = false;

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      return;
    }

    const config = readXStreamConfig();
    if (!config) {
      console.warn('[SocialMonitor] X_BEARER_TOKEN not set; social alerts are disabled');
      return;
    }

    this.provider = new XFilteredStreamProvider(config);
    this.isMonitoring = true;

    await this.doRefresh();
    await this.provider.start((tweets) => processTweets(tweets));

    this.refreshTimer = setInterval(() => {
      this.refreshAlerts().catch(console.error);
      pruneProcessedTweets().catch(console.error);
    }, ALERT_REFRESH_INTERVAL_MS);

    console.warn(
      `[SocialMonitor] Started with ${this.eligibleAlerts.length}/${this.alerts.length} eligible alerts`
    );
  }

  async stopMonitoring(): Promise<void> {
    this.isMonitoring = false;
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    await this.provider?.stop();
    this.provider = null;
    console.warn('[SocialMonitor] Stopped');
  }

  /**
   * Called after any alert mutation. Debounced and serialized so a burst of edits produces one
   * rule sync (each sync is a few X API calls, none of them billed).
   */
  refreshAlerts(): Promise<void> {
    if (!this.isMonitoring) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = null;
        this.runRefresh().then(resolve, (error) => {
          console.error('[SocialMonitor] Refresh failed:', error);
          resolve();
        });
      }, REFRESH_DEBOUNCE_MS);
    });
  }

  private runRefresh(): Promise<void> {
    if (this.refreshing) {
      this.refreshQueued = true;
      return this.refreshing;
    }
    this.refreshing = this.doRefresh().finally(() => {
      this.refreshing = null;
      if (this.refreshQueued) {
        this.refreshQueued = false;
        this.runRefresh().catch(console.error);
      }
    });
    return this.refreshing;
  }

  private async doRefresh(): Promise<void> {
    this.alerts = await fetchActiveAlerts();
    const overQuota = await getUsersOverTweetQuota(this.alerts.map((a) => a.user_id));
    this.eligibleAlerts = this.alerts.filter((a) => !overQuota.has(a.user_id));

    if (overQuota.size > 0) {
      console.warn(
        `[SocialMonitor] ${overQuota.size} user(s) over monthly tweet quota, alerts paused`
      );
    }

    await this.provider?.syncAlerts(this.eligibleAlerts);
  }

  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      totalAlerts: this.alerts.length,
      eligibleAlerts: this.eligibleAlerts.length,
      provider: this.provider?.getStatus() ?? null,
    };
  }
}

// Single instance per process, survives Next.js dev HMR module reloads.
const globalRef = globalThis as typeof globalThis & { __cryptosentrySocialMonitor?: SocialMonitor };
export const socialMonitor: SocialMonitor =
  globalRef.__cryptosentrySocialMonitor ??
  (globalRef.__cryptosentrySocialMonitor = new SocialMonitor());
