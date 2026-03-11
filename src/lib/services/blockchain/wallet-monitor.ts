import { createServiceSupabaseClient } from '@/lib/supabase/server';
import { sendUnifiedAlert } from '@/actions/messaging/unified-notifications';
import { EtherscanProvider } from './providers/etherscan';
import { SolscanProvider } from './providers/solscan';
import type { WalletAlertRow, ChainProvider, WalletTransaction } from './types';
import type { AlertNotification } from '@/types/notifications';

const DEFAULT_POLL_INTERVAL_MS = 60_000;
const ALERT_REFRESH_INTERVAL = 10;
const STAGGER_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const chainProviders: Record<string, ChainProvider> = {
  eth: new EtherscanProvider(),
  sol: new SolscanProvider(),
};

export class WalletMonitor {
  private alerts: WalletAlertRow[] = [];
  private isMonitoring = false;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollCount = 0;
  private seenTxHashes = new Set<string>();
  private readonly maxSeenCache = 10_000;

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      return;
    }

    this.alerts = await this.fetchActiveAlerts();
    this.isMonitoring = true;
    this.pollCount = 0;

    this.schedulePoll(0);
    console.warn(`[WalletMonitor] Started with ${this.alerts.length} alerts`);
  }

  async stopMonitoring(): Promise<void> {
    this.isMonitoring = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    console.warn('[WalletMonitor] Stopped');
  }

  async refreshAlerts(): Promise<void> {
    this.alerts = await this.fetchActiveAlerts();
  }

  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      activeAlerts: this.alerts.length,
      pollCount: this.pollCount,
    };
  }

  private async fetchActiveAlerts(): Promise<WalletAlertRow[]> {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from('wallet_alerts')
      .select('id, user_id, address, label, chain, min_value_usd, is_active, created_at')
      .eq('is_active', true);

    if (error) {
      console.error('[WalletMonitor] Failed to fetch alerts:', error);
      return [];
    }

    return (data ?? []) as WalletAlertRow[];
  }

  private schedulePoll(delayMs: number): void {
    if (!this.isMonitoring) {
      return;
    }
    this.pollTimer = setTimeout(() => {
      this.pollAllWallets().catch(console.error);
    }, delayMs);
  }

  private evictSeenCache(): void {
    if (this.seenTxHashes.size > this.maxSeenCache) {
      const excess = this.seenTxHashes.size - this.maxSeenCache;
      const iterator = this.seenTxHashes.values();
      for (let i = 0; i < excess; i++) {
        const next = iterator.next();
        if (!next.done) {
          this.seenTxHashes.delete(next.value);
        }
      }
    }
  }

  private async pollAllWallets(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    this.pollCount += 1;

    // Refresh alerts periodically
    if (this.pollCount % ALERT_REFRESH_INTERVAL === 0) {
      await this.refreshAlerts();
    }

    if (this.alerts.length === 0) {
      this.schedulePoll(DEFAULT_POLL_INTERVAL_MS);
      return;
    }

    console.warn(`[WalletMonitor] Polling ${this.alerts.length} wallet alerts...`);

    // Group alerts by address+chain to avoid duplicate fetches
    const grouped = new Map<string, WalletAlertRow[]>();
    for (const alert of this.alerts) {
      const key = `${alert.chain}:${alert.address}`;
      const existing = grouped.get(key) ?? [];
      existing.push(alert);
      grouped.set(key, existing);
    }

    for (const [key, alertsForWallet] of grouped) {
      if (!this.isMonitoring) {
        return;
      }

      const [chain, address] = key.split(':');
      const provider = chainProviders[chain];
      if (!provider) {
        continue;
      }

      try {
        const transactions = await provider.fetchRecentTransactions(address);

        for (const tx of transactions) {
          if (this.seenTxHashes.has(tx.hash)) {
            continue;
          }
          this.seenTxHashes.add(tx.hash);

          // Check each alert for this wallet
          for (const alert of alertsForWallet) {
            if (tx.valueUsd >= alert.min_value_usd) {
              await this.triggerWalletAlert(alert, tx);
            }
          }
        }
      } catch (error) {
        console.error(`[WalletMonitor] Error polling ${key}:`, error);
      }

      // Stagger between wallets
      await sleep(STAGGER_MS);
    }

    this.evictSeenCache();
    this.schedulePoll(DEFAULT_POLL_INTERVAL_MS);
  }

  private async triggerWalletAlert(
    alert: WalletAlertRow,
    tx: WalletTransaction
  ): Promise<void> {
    const supabase = createServiceSupabaseClient();

    try {
      // Persist trigger
      const { error: triggerError } = await supabase.from('alert_triggers').insert({
        alert_id: alert.id,
        user_id: alert.user_id,
        type: 'whale',
        data: {
          tx_hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          value_usd: tx.valueUsd,
          token_symbol: tx.tokenSymbol,
          chain: alert.chain,
        },
        triggered_at: new Date().toISOString(),
      });

      if (triggerError) {
        console.error('[WalletMonitor] Failed to insert trigger:', triggerError);
      }

      // Send notification
      const label = alert.label ?? alert.address.slice(0, 8);
      const notification: AlertNotification = {
        userId: alert.user_id,
        alertType: 'whale',
        alertId: alert.id,
        message: `Whale Alert: ${label} moved $${tx.valueUsd.toFixed(0)} in ${tx.tokenSymbol}`,
        data: {
          tx_hash: tx.hash,
          from_address: tx.from,
          to_address: tx.to,
          value_usd: tx.valueUsd,
          token_symbol: tx.tokenSymbol,
          chain: alert.chain,
        },
      };

      await sendUnifiedAlert(notification);

      console.warn(
        `[WalletMonitor] Triggered alert ${alert.id}: ${tx.tokenSymbol} $${tx.valueUsd.toFixed(0)} on ${alert.chain}`
      );
    } catch (error) {
      console.error(`[WalletMonitor] Error triggering alert ${alert.id}:`, error);
    }
  }
}

export const walletMonitor = new WalletMonitor();
