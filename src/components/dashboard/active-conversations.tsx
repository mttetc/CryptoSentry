'use client';

import { useState, useDeferredValue } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { SpotlightCard } from '@/components/ui/spotlight';
import {
  Twitter,
  Hash,
  Heart,
  Repeat2,
  MessageCircle,
  Phone,
  PhoneCall,
  Activity,
  Trash2,
  Pause,
  Play,
  ChevronRight,
} from 'lucide-react';
import { deleteSocialAlert, updateSocialAlert } from '@/actions/alerts';
import { formatDistance } from 'date-fns';
import { useNow } from '@/hooks/use-now';
import { plural } from '@/lib/utils/plural';
import type { SocialAlertWithStats, AlertTweet } from '@/types/alerts';

interface ActiveConversationsProps {
  userId: string;
  alerts: SocialAlertWithStats[];
  onDeleteAlert?: (id: string) => void;
  onToggleAlert?: (id: string) => void;
  flashAlertIds?: Set<string>;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.25 } },
};

function TweetCard({ tweet }: { tweet: AlertTweet }) {
  const now = useNow();
  return (
    <div className="rounded-lg border p-2.5">
      <div className="mb-1 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <a
            href={`https://x.com/${tweet.author}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-mono text-xs font-medium hover:underline"
          >
            @{tweet.author}
          </a>
          <span className="text-muted-foreground text-[11px]">
            {formatDistance(new Date(tweet.timestamp), now, { addSuffix: true })}
          </span>
        </div>
        <a
          href={tweet.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground"
        >
          <Twitter className="h-3 w-3" />
        </a>
      </div>
      <p className="text-muted-foreground mb-1.5 text-xs leading-relaxed">
        {tweet.text.length > 140 ? `${tweet.text.slice(0, 140)}...` : tweet.text}
      </p>
      <div className="text-muted-foreground flex items-center gap-3 text-[11px]">
        <span className="flex items-center gap-1">
          <Heart className="h-2.5 w-2.5" />
          {tweet.engagement.likes}
        </span>
        <span className="flex items-center gap-1">
          <Repeat2 className="h-2.5 w-2.5" />
          {tweet.engagement.retweets}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="h-2.5 w-2.5" />
          {tweet.engagement.replies}
        </span>
      </div>
    </div>
  );
}

function CompactAlertCard({
  alert,
  isFlashing,
  onDelete,
  onToggle,
}: {
  alert: SocialAlertWithStats;
  isFlashing: boolean;
  onDelete?: (id: string) => void;
  onToggle?: (id: string) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const now = useNow();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteSocialAlert(alert.id);
      if (result.success) {
        onDelete?.(alert.id);
      }
    } catch {
      // Silent
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      const result = await updateSocialAlert({
        id: alert.id,
        isActive: !alert.is_active,
      });
      if (result.success) {
        onToggle?.(alert.id);
      }
    } catch {
      // Silent
    } finally {
      setIsToggling(false);
    }
  };

  const matchCount = alert.recentTweets.length;

  return (
    <motion.div variants={cardVariants} layout>
      <SpotlightCard className={`bg-card border ${isFlashing ? 'animate-flash-red' : ''}`}>
        <div className="p-4">
          {/* Row 1: Account + badges + actions */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <a
                href={`https://x.com/${alert.account}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary truncate font-mono text-sm font-medium"
              >
                @{alert.account}
              </a>
              <span className="text-muted-foreground hidden text-xs sm:inline">
                {plural(alert.keywords.length, 'keyword')}
              </span>
              <Badge variant={alert.is_active ? 'default' : 'secondary'}>
                {alert.is_active ? 'Active' : 'Paused'}
              </Badge>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {alert.telegram_conversation_id && (
                <Badge variant="outline">
                  {alert.call_enabled ? (
                    <PhoneCall className="h-3 w-3" />
                  ) : (
                    <Phone className="h-3 w-3" />
                  )}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggle}
                disabled={isToggling}
                aria-label={alert.is_active ? 'Pause alert' : 'Resume alert'}
                className="h-7 w-7"
              >
                {(() => {
                  if (isToggling) {
                    return <Spinner size="sm" />;
                  }
                  if (alert.is_active) {
                    return <Pause className="h-3.5 w-3.5" />;
                  }
                  return <Play className="h-3.5 w-3.5" />;
                })()}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                disabled={isDeleting}
                aria-label="Delete alert"
                className="text-muted-foreground hover:text-destructive h-7 w-7"
              >
                {isDeleting ? <Spinner size="sm" /> : <Trash2 className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          {/* Row 2: Keywords + stats */}
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap gap-1">
              {alert.keywords.map((keyword) => (
                <Badge key={keyword} variant="outline" className="font-mono text-[11px]">
                  <Hash className="mr-0.5 h-2.5 w-2.5" />
                  {keyword}
                </Badge>
              ))}
            </div>
            <div className="text-muted-foreground flex shrink-0 items-center gap-3 text-xs">
              <span className="font-mono">{plural(alert.tweetCount, 'tweet')}</span>
              {alert.lastActivity && (
                <span>
                  {formatDistance(new Date(alert.lastActivity), now, { addSuffix: true })}
                </span>
              )}
            </div>
          </div>

          {/* Row 3: Expandable recent matches */}
          {matchCount > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-primary/70 hover:text-primary flex items-center gap-1 text-xs"
              >
                <ChevronRight
                  className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
                />
                {plural(matchCount, 'recent match', 'recent matches')}
              </button>
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 space-y-1.5">
                      {alert.recentTweets.slice(0, 5).map((tweet) => (
                        <TweetCard key={tweet.id} tweet={tweet} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Incoming call toast */}
          <AnimatePresence>
            {isFlashing && alert.call_enabled && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
                className="border-primary/20 mt-3 rounded-lg border bg-[#1a1a1a] px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-primary/20 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                    <Phone className="text-primary h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">CryptoSentry</p>
                    <p className="text-primary text-xs">Incoming call...</p>
                  </div>
                  <div className="bg-primary h-2.5 w-2.5 animate-pulse rounded-full" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="col-span-full rounded-xl border border-dashed p-12 text-center"
    >
      <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
        <Activity className="text-primary h-6 w-6" />
      </div>
      <p className="text-muted-foreground text-sm">
        No alerts yet. Click <strong className="text-foreground">New Alert</strong> to get started.
      </p>
    </motion.div>
  );
}

export function ActiveConversations({
  alerts,
  onDeleteAlert,
  onToggleAlert,
  flashAlertIds = new Set(),
}: ActiveConversationsProps) {
  const deferredAlerts = useDeferredValue(alerts);

  return (
    <div className="flex flex-col gap-2">
      {deferredAlerts.length === 0 ? (
        <EmptyState />
      ) : (
        <AnimatePresence mode="popLayout">
          {deferredAlerts.map((alert) => (
            <CompactAlertCard
              key={alert.id}
              alert={alert}
              isFlashing={flashAlertIds.has(alert.id)}
              onDelete={onDeleteAlert}
              onToggle={onToggleAlert}
            />
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
