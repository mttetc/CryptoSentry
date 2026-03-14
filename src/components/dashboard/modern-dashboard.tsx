'use client';

import { useState, useEffect } from 'react';
import { useQueryState, parseAsStringLiteral } from 'nuqs';
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
import { CreateAlertDialog } from './create-alert-dialog';
import { CreatePriceAlertDialog } from './create-price-alert-dialog';
import { CreateWalletAlertDialog } from './create-wallet-alert-dialog';
import { useAlertStream, type TriggerEvent } from '@/hooks/use-alert-stream';
import { useNewMatchAlertIds } from '@/hooks/use-new-matches';
import { useNotificationSound } from '@/hooks/use-notification-sound';
import type {
  SocialAlertWithStats,
  PriceAlertWithStats,
  WalletAlertWithStats,
} from '@/types/alerts';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

const ALERTS_PER_TYPE = 2;

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

function UsageInfo({
  count,
  limit,
  label,
  plan,
}: {
  count: number;
  limit: number;
  label: string;
  plan: string;
}) {
  return (
    <span className="text-muted-foreground text-xs">
      {count}/{limit} {label} ({plan})
    </span>
  );
}

function handleOptimisticAlertCreated(
  data: { account: string; keywords: string[]; platform: string },
  userId: string,
  setAlerts: React.Dispatch<React.SetStateAction<SocialAlertWithStats[]>>
) {
  setAlerts((prev) => [
    {
      id: `optimistic-${Date.now()}`,
      user_id: userId,
      platform: data.platform,
      account: data.account,
      keywords: data.keywords,
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

export function ModernDashboard({
  userId,
  initialAlerts,
  initialPriceAlerts,
  initialWalletAlerts,
  planInfo,
}: ModernDashboardProps) {
  const TABS = ['social', 'price', 'whale', 'advanced'] as const;
  const [tab, setTab] = useQueryState('tab', parseAsStringLiteral(TABS).withDefault('social'));

  const [alerts, setAlerts] = useState<SocialAlertWithStats[]>(initialAlerts ?? []);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlertWithStats[]>(initialPriceAlerts ?? []);
  const [walletAlerts, setWalletAlerts] = useState<WalletAlertWithStats[]>(
    initialWalletAlerts ?? []
  );
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [recentTriggers, setRecentTriggers] = useState<TriggerEvent[]>([]);
  const flashAlertIds = useNewMatchAlertIds(alerts);
  const [polling, setPolling] = useState(true);
  const { play: playAlertSound } = useNotificationSound();

  const plan = planInfo?.plan ?? 'Free';

  // SSE connection
  useAlertStream({
    onPriceUpdate: (data) => {
      setLivePrices(data.prices);
    },
    onPriceTriggered: (data) => {
      // Ignore stale triggers (direction changed since server evaluated)
      const matchingAlert = priceAlerts.find((a) => a.id === data.alertId);
      if (!matchingAlert || matchingAlert.direction !== data.direction) {
        return;
      }
      setRecentTriggers((prev) => [data, ...prev].slice(0, 20));
      playAlertSound();
      refreshPriceAlerts();
    },
    onWhaleTriggered: (data) => {
      setRecentTriggers((prev) => [data, ...prev].slice(0, 20));
      playAlertSound();
    },
  });

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

  // Listen for alert-created events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { account: string; keywords: string[]; platform: string }
        | undefined;
      if (detail) {
        handleOptimisticAlertCreated(detail, userId, setAlerts);
      }
    };
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

  // Social polling only — price/whale handled by SSE/WebSocket
  const hasActiveAlerts = alerts.some((a) => a.is_active);

  useEffect(() => {
    if (!hasActiveAlerts || !polling) {
      return;
    }
    const interval = setInterval(refreshAlerts, 60_000);
    return () => clearInterval(interval);
  }, [hasActiveAlerts, polling]);

  const accounts = [...new Set(alerts.map((a) => a.account))];
  const filteredAlerts =
    selectedAccount === 'all' ? alerts : alerts.filter((a) => a.account === selectedAccount);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className="flex flex-col gap-4 lg:flex-row"
    >
      <div className="min-w-0 flex-1">
        <Tabs
          value={tab}
          className="w-full"
          onValueChange={(v) => {
            setTab(v as (typeof TABS)[number]);
          }}
        >
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
            <div className="mb-3 flex items-center justify-between gap-2">
              <UsageInfo
                count={alerts.length}
                limit={ALERTS_PER_TYPE}
                label="Social alerts"
                plan={plan}
              />
              <div className="flex items-center gap-2">
                {accounts.length > 1 && (
                  <div className="flex items-center gap-2">
                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
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
                      <Button variant="link" size="sm" onClick={() => setSelectedAccount('all')}>
                        Clear
                      </Button>
                    )}
                  </div>
                )}
                <CreateAlertDialog
                  userId={userId}
                  onAlertCreated={(data) => {
                    window.dispatchEvent(new CustomEvent('alert-created', { detail: data }));
                  }}
                />
              </div>
            </div>
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
            <div className="mb-3 flex items-center justify-between gap-2">
              <UsageInfo
                count={priceAlerts.length}
                limit={ALERTS_PER_TYPE}
                label="Price alerts"
                plan={plan}
              />
              <CreatePriceAlertDialog />
            </div>
            <PriceAlertsList
              alerts={priceAlerts}
              livePrices={livePrices}
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
            <div className="mb-3 flex items-center justify-between gap-2">
              <UsageInfo
                count={walletAlerts.length}
                limit={ALERTS_PER_TYPE}
                label="Whale alerts"
                plan={plan}
              />
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
        <LiveFeed alerts={alerts} flashAlertIds={flashAlertIds} recentTriggers={recentTriggers} />
      </div>
    </motion.div>
  );
}
