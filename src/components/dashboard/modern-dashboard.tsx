'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { LogoMark } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LogOut } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { CreateAlertDialog } from './create-alert-dialog';
import { ActiveConversations } from './active-conversations';
import { LiveFeed } from './live-feed';
import { useNewMatchAlertIds } from '@/hooks/use-new-matches';
import { pluralWord } from '@/lib/utils/plural';
import type { SocialAlertWithStats } from '@/types/alerts';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

interface ModernDashboardProps {
  userId: string;
  userEmail?: string;
  initialAlerts?: SocialAlertWithStats[];
}

export function ModernDashboard({ userId, userEmail, initialAlerts }: ModernDashboardProps) {
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

  useEffect(() => {
    if (alerts.length === 0 || !polling) {
      return;
    }
    const interval = setInterval(refreshAlerts, 60_000);
    return () => {
      clearInterval(interval);
    };
  }, [alerts.length, polling]);

  const accounts = [...new Set(alerts.map((a) => a.account))];
  const filteredAlerts =
    selectedAccount === 'all' ? alerts : alerts.filter((a) => a.account === selectedAccount);

  const totalTweets = alerts.reduce((sum, a) => sum + a.tweetCount, 0);
  const totalKeywords = alerts.reduce((sum, a) => sum + a.keywords.length, 0);

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.header
        variants={fadeUp}
        className="bg-background/80 fixed top-0 right-0 left-0 z-50 border-b backdrop-blur-md"
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={20} />
            <span className="text-sm font-semibold tracking-tight">CryptoSentry</span>
          </Link>

          <div className="hidden items-center gap-3 md:flex">
            <Badge variant="default">
              {alerts.length} {pluralWord(alerts.length, 'alert')}
            </Badge>
            <Badge variant="secondary">
              {totalTweets} {pluralWord(totalTweets, 'tweet')} today
            </Badge>
            <Badge variant="secondary">
              {totalKeywords} {pluralWord(totalKeywords, 'keyword')}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            {userEmail && (
              <span className="text-muted-foreground hidden text-sm lg:inline">{userEmail}</span>
            )}
            <Button variant="ghost" size="sm" onClick={() => authClient.signOut()}>
              <LogOut className="mr-1.5 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Title row */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary h-2 w-2 rounded-full" />
          <h2 className="text-lg font-semibold tracking-tight">Your Alerts</h2>
        </div>

        <div className="flex items-center gap-3">
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
          <CreateAlertDialog userId={userId} onAlertCreated={refreshAlerts} />
        </div>
      </motion.div>

      {/* Two-column layout: Alerts left, Feed right */}
      <motion.div variants={fadeUp} className="flex flex-col gap-4 lg:flex-row">
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
    </motion.div>
  );
}
