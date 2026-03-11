'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActiveConversations } from './active-conversations';
import { LiveFeed } from './live-feed';
import { PriceAlertsList } from './price-alerts-list';
import { WalletAlertsList } from './wallet-alerts-list';
import { CreatePriceAlertDialog } from './create-price-alert-dialog';
import { CreateWalletAlertDialog } from './create-wallet-alert-dialog';
import { UsageBadge } from './usage-badge';
import { useNewMatchAlertIds } from '@/hooks/use-new-matches';
import { pluralWord } from '@/lib/utils/plural';
import type {
  SocialAlertWithStats,
  PriceAlertWithStats,
  WalletAlertWithStats,
} from '@/types/alerts';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

interface PlanInfo {
  plan: string;
  usage: number;
  limit: number;
}

interface ModernDashboardProps {
  userId: string;
  initialAlerts?: SocialAlertWithStats[];
  initialPriceAlerts?: PriceAlertWithStats[];
  initialWalletAlerts?: WalletAlertWithStats[];
  planInfo?: PlanInfo;
}

function HeaderBadges({
  alerts,
  priceAlertCount,
  walletAlertCount,
  planInfo,
}: {
  alerts: SocialAlertWithStats[];
  priceAlertCount: number;
  walletAlertCount: number;
  planInfo?: PlanInfo;
}) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.querySelector<HTMLElement>('#dashboard-header-badges'));
  }, []);

  const totalAlerts = alerts.length + priceAlertCount + walletAlertCount;
  const totalTweets = alerts.reduce((sum, a) => sum + a.tweetCount, 0);

  if (!target) {
    return null;
  }

  return createPortal(
    <>
      {planInfo ? (
        <UsageBadge usage={planInfo.usage} limit={planInfo.limit} plan={planInfo.plan} />
      ) : (
        <Badge variant="default">
          {totalAlerts} {pluralWord(totalAlerts, 'alert')}
        </Badge>
      )}
      <Badge variant="secondary">
        {totalTweets} {pluralWord(totalTweets, 'tweet')} today
      </Badge>
    </>,
    target
  );
}

function AccountFilter({
  accounts,
  selectedAccount,
  onSelect,
}: {
  accounts: string[];
  selectedAccount: string;
  onSelect: (value: string) => void;
}) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.querySelector<HTMLElement>('#dashboard-account-filter'));
  }, []);

  if (!target || accounts.length <= 1) {
    return null;
  }

  return createPortal(
    <div className="flex items-center gap-2">
      <Select value={selectedAccount} onValueChange={onSelect}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All accounts</SelectItem>
          {accounts.map((acc) => (
            <SelectItem key={acc} value={acc}>
              @{acc}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedAccount !== 'all' && (
        <Button variant="link" size="sm" onClick={() => onSelect('all')}>
          Clear
        </Button>
      )}
    </div>,
    target
  );
}

export function ModernDashboard({
  userId,
  initialAlerts,
  initialPriceAlerts,
  initialWalletAlerts,
  planInfo,
}: ModernDashboardProps) {
  const [alerts, setAlerts] = useState<SocialAlertWithStats[]>(initialAlerts ?? []);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlertWithStats[]>(initialPriceAlerts ?? []);
  const [walletAlerts, setWalletAlerts] = useState<WalletAlertWithStats[]>(
    initialWalletAlerts ?? []
  );
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const flashAlertIds = useNewMatchAlertIds(alerts);

  const [polling, setPolling] = useState(true);

  const refreshAlerts = async () => {
    try {
      const response = await fetch('/api/alerts/social');
      if (response.status === 401) {
        setPolling(false);
        return;
      }
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch {
      // Silent
    }
  };

  const refreshPriceAlerts = async () => {
    try {
      const response = await fetch('/api/alerts/price');
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setPriceAlerts(data.alerts || []);
    } catch {
      // Silent
    }
  };

  // Listen for alert-created events from the title row
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | {
            account: string;
            keywords: string[];
            platform: string;
          }
        | undefined;

      if (detail) {
        // Optimistic: add placeholder alert immediately
        setAlerts((prev) => [
          {
            id: `optimistic-${Date.now()}`,
            user_id: userId,
            platform: detail.platform,
            account: detail.account,
            keywords: detail.keywords,
            is_active: true,
            call_enabled: true,
            created_at: new Date().toISOString(),
            tweetCount: 0,
            lastActivity: '',
            recentTweets: [],
          },
          ...prev,
        ]);
      }
    };
    // Reconcile when the server action finishes
    const syncHandler = () => refreshAlerts();
    const priceSyncHandler = () => refreshPriceAlerts();
    window.addEventListener('alert-created', handler);
    window.addEventListener('alert-synced', syncHandler);
    window.addEventListener('price-alert-synced', priceSyncHandler);
    return () => {
      window.removeEventListener('alert-created', handler);
      window.removeEventListener('alert-synced', syncHandler);
      window.removeEventListener('price-alert-synced', priceSyncHandler);
    };
  }, []);

  const hasActiveAlerts = alerts.some((a) => a.is_active);

  useEffect(() => {
    if (!hasActiveAlerts || !polling) {
      return;
    }
    const interval = setInterval(refreshAlerts, 60_000);
    return () => {
      clearInterval(interval);
    };
  }, [hasActiveAlerts, polling]);

  // Poll price alerts when there are active ones
  const hasActivePriceAlerts = priceAlerts.some((a) => a.is_active);

  useEffect(() => {
    if (!hasActivePriceAlerts || !polling) {
      return;
    }
    const interval = setInterval(refreshPriceAlerts, 60_000);
    return () => {
      clearInterval(interval);
    };
  }, [hasActivePriceAlerts, polling]);

  const accounts = [...new Set(alerts.map((a) => a.account))];
  const filteredAlerts =
    selectedAccount === 'all' ? alerts : alerts.filter((a) => a.account === selectedAccount);

  return (
    <>
      {/* Portal badges into header */}
      <HeaderBadges
        alerts={alerts}
        priceAlertCount={priceAlerts.length}
        walletAlertCount={walletAlerts.length}
        planInfo={planInfo}
      />

      {/* Portal account filter into title row */}
      <AccountFilter
        accounts={accounts}
        selectedAccount={selectedAccount}
        onSelect={setSelectedAccount}
      />

      {/* Two-column layout: Tabs left, Feed right */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="flex flex-col gap-4 lg:flex-row"
      >
        <div className="min-w-0 flex-1">
          <Tabs defaultValue="social" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="social">
                Social
                {alerts.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">
                    {alerts.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="price">
                Price
                {priceAlerts.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">
                    {priceAlerts.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="whale">
                Whale
                {walletAlerts.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">
                    {walletAlerts.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="social">
              <ActiveConversations
                userId={userId}
                alerts={filteredAlerts}
                onDeleteAlert={(id) => {
                  setAlerts((prev) => prev.filter((a) => a.id !== id));
                }}
                onToggleAlert={(id) => {
                  setAlerts((prev) =>
                    prev.map((a) => (a.id === id ? { ...a, is_active: !a.is_active } : a))
                  );
                }}
                flashAlertIds={flashAlertIds}
              />
            </TabsContent>

            <TabsContent value="price">
              <div className="mb-3 flex items-center justify-end">
                <CreatePriceAlertDialog />
              </div>
              <PriceAlertsList
                alerts={priceAlerts}
                onDelete={(id) => {
                  setPriceAlerts((prev) => prev.filter((a) => a.id !== id));
                }}
                onToggle={(id) => {
                  setPriceAlerts((prev) =>
                    prev.map((a) => (a.id === id ? { ...a, is_active: !a.is_active } : a))
                  );
                }}
              />
            </TabsContent>

            <TabsContent value="whale">
              <div className="mb-3 flex items-center justify-end">
                <CreateWalletAlertDialog />
              </div>
              <WalletAlertsList
                alerts={walletAlerts}
                onDelete={(id) => {
                  setWalletAlerts((prev) => prev.filter((a) => a.id !== id));
                }}
                onToggle={(id) => {
                  setWalletAlerts((prev) =>
                    prev.map((a) => (a.id === id ? { ...a, is_active: !a.is_active } : a))
                  );
                }}
              />
            </TabsContent>

            <TabsContent value="advanced">
              <div className="rounded-xl border border-dashed p-12 text-center">
                <p className="text-muted-foreground text-sm">
                  Composite and conditional alerts coming with Premium plan.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <div className="lg:sticky lg:top-20 lg:w-[350px] lg:shrink-0 lg:self-start">
          <LiveFeed alerts={alerts} flashAlertIds={flashAlertIds} />
        </div>
      </motion.div>
    </>
  );
}
