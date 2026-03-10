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
import { ActiveConversations } from './active-conversations';
import { LiveFeed } from './live-feed';
import { UsageBadge } from './usage-badge';
import { useNewMatchAlertIds } from '@/hooks/use-new-matches';
import { pluralWord } from '@/lib/utils/plural';
import type { SocialAlertWithStats } from '@/types/alerts';

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
  planInfo?: PlanInfo;
}

function HeaderBadges({ alerts, planInfo }: { alerts: SocialAlertWithStats[]; planInfo?: PlanInfo }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.querySelector<HTMLElement>('#dashboard-header-badges'));
  }, []);

  const totalTweets = alerts.reduce((sum, a) => sum + a.tweetCount, 0);
  const totalKeywords = alerts.reduce((sum, a) => sum + a.keywords.length, 0);

  if (!target) {
    return null;
  }

  return createPortal(
    <>
      {planInfo ? (
        <UsageBadge usage={planInfo.usage} limit={planInfo.limit} plan={planInfo.plan} />
      ) : (
        <Badge variant="default">
          {alerts.length} {pluralWord(alerts.length, 'alert')}
        </Badge>
      )}
      <Badge variant="secondary">
        {totalTweets} {pluralWord(totalTweets, 'tweet')} today
      </Badge>
      <Badge variant="secondary">
        {totalKeywords} {pluralWord(totalKeywords, 'keyword')}
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

export function ModernDashboard({ userId, initialAlerts, planInfo }: ModernDashboardProps) {
  const [alerts, setAlerts] = useState<SocialAlertWithStats[]>(initialAlerts ?? []);
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
    // Reconcile when the server action finishes (fired by create-alert-form)
    const syncHandler = () => refreshAlerts();
    window.addEventListener('alert-created', handler);
    window.addEventListener('alert-synced', syncHandler);
    return () => {
      window.removeEventListener('alert-created', handler);
      window.removeEventListener('alert-synced', syncHandler);
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

  const accounts = [...new Set(alerts.map((a) => a.account))];
  const filteredAlerts =
    selectedAccount === 'all' ? alerts : alerts.filter((a) => a.account === selectedAccount);

  return (
    <>
      {/* Portal badges into header */}
      <HeaderBadges alerts={alerts} planInfo={planInfo} />

      {/* Portal account filter into title row */}
      <AccountFilter
        accounts={accounts}
        selectedAccount={selectedAccount}
        onSelect={setSelectedAccount}
      />

      {/* Two-column layout: Alerts left, Feed right */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="flex flex-col gap-4 lg:flex-row"
      >
        <div className="min-w-0 flex-1">
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
        </div>
        <div className="lg:sticky lg:top-20 lg:w-[350px] lg:shrink-0 lg:self-start">
          <LiveFeed alerts={alerts} flashAlertIds={flashAlertIds} />
        </div>
      </motion.div>
    </>
  );
}
