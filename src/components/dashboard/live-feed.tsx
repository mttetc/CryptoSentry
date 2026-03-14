'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SocialAlertWithStats, AlertTweet } from '@/types/alerts';
import type { TriggerEvent } from '@/hooks/use-alert-stream';

interface LiveFeedProps {
  alerts: SocialAlertWithStats[];
  flashAlertIds?: Set<string>;
  recentTriggers?: TriggerEvent[];
}

interface FeedItem extends AlertTweet {
  alertId: string;
  matchedKeywords: string[];
  callEnabled: boolean;
  sentiment?: string | null;
  summary?: string | null;
}

interface TriggerFeedItem {
  id: string;
  type: 'price' | 'whale';
  message: string;
  timestamp: string;
}

function collectFeedItems(alerts: SocialAlertWithStats[]): FeedItem[] {
  const items: FeedItem[] = [];

  for (const alert of alerts) {
    for (const tweet of alert.recentTweets) {
      const matched = alert.keywords.filter((kw) =>
        tweet.text.toLowerCase().includes(kw.toLowerCase())
      );
      items.push({
        ...tweet,
        alertId: alert.id,
        matchedKeywords: matched,
        callEnabled: alert.call_enabled,
      });
    }
  }

  return items
    .toSorted((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);
}

function collectTriggerItems(triggers: TriggerEvent[]): TriggerFeedItem[] {
  return triggers.slice(0, 6).map((t, i) => {
    if (t.type === 'price:triggered') {
      return {
        id: `trigger-price-${t.alertId}-${i}`,
        type: 'price' as const,
        message: `${t.symbol.toUpperCase()} hit $${t.currentPrice} (target: $${t.targetPrice} ${t.direction})`,
        timestamp: new Date().toISOString(),
      };
    }
    return {
      id: `trigger-whale-${t.alertId}-${i}`,
      type: 'whale' as const,
      message: `Whale: $${t.valueUsd.toFixed(0)} ${t.tokenSymbol} on ${t.chain}`,
      timestamp: new Date().toISOString(),
    };
  });
}

function highlightKeywords(text: string, keywords: string[]) {
  if (keywords.length === 0) {
    return text;
  }

  const escaped = keywords.map((k) => k.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`));
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(pattern);

  return parts.map((part, i) => {
    const isMatch = keywords.some((kw) => kw.toLowerCase() === part.toLowerCase());
    if (isMatch) {
      return (
        <span key={i} className="text-primary font-semibold">
          {part}
        </span>
      );
    }
    return part;
  });
}

function FeedEntry({ item, isCalling }: { item: FeedItem; isCalling: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="mb-4 last:mb-0"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <a
            href={`https://x.com/${item.author}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-mono text-sm font-medium hover:underline"
          >
            @{item.author}
          </a>
          <div className="mt-1 flex items-center gap-1.5">
            {item.sentiment && (
              <Badge
                variant="outline"
                className={cn(
                  'font-mono text-[10px]',
                  item.sentiment === 'bullish' && 'border-green-500/20 text-green-500',
                  item.sentiment === 'bearish' && 'border-red-500/20 text-red-500',
                  item.sentiment === 'neutral' && 'text-muted-foreground'
                )}
              >
                {item.sentiment}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            {highlightKeywords(
              item.text.length > 200 ? `${item.text.slice(0, 200)}...` : item.text,
              item.matchedKeywords
            )}
          </p>
          {item.summary && (
            <p className="text-muted-foreground mt-0.5 text-xs italic">{item.summary}</p>
          )}
        </div>
        {isCalling && (
          <Badge
            variant="outline"
            className="text-primary border-primary/20 ml-3 shrink-0 font-mono text-xs"
          >
            CALLING
          </Badge>
        )}
      </div>
    </motion.div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function TriggerFeedEntry({ item }: { item: TriggerFeedItem }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="mb-4 last:mb-0"
    >
      <div className="flex items-start gap-2">
        <Badge
          variant="outline"
          className={cn(
            'mt-0.5 shrink-0 font-mono text-[10px]',
            item.type === 'price' && 'border-yellow-500/20 text-yellow-500',
            item.type === 'whale' && 'border-blue-500/20 text-blue-500'
          )}
        >
          {item.type === 'price' ? 'PRICE' : 'WHALE'}
        </Badge>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-sm">{item.message}</p>
          <span className="text-muted-foreground/50 font-mono text-[10px]">
            {formatTime(item.timestamp)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export function LiveFeed({
  alerts,
  flashAlertIds = new Set(),
  recentTriggers = [],
}: LiveFeedProps) {
  const items = collectFeedItems(alerts);
  const triggerItems = collectTriggerItems(recentTriggers);
  const hasContent = items.length > 0 || triggerItems.length > 0;

  return (
    <div className="bg-card rounded-xl border">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <div className="bg-primary h-2 w-2 animate-pulse rounded-full" />
        <span className="text-muted-foreground font-mono text-sm">Live Feed</span>
      </div>
      {hasContent ? (
        <div className="px-4 py-3">
          <AnimatePresence mode="popLayout">
            {triggerItems.map((item) => (
              <TriggerFeedEntry key={item.id} item={item} />
            ))}
            {items.map((item) => (
              <FeedEntry
                key={item.id}
                item={item}
                isCalling={
                  item.callEnabled &&
                  item.matchedKeywords.length > 0 &&
                  flashAlertIds.has(item.alertId)
                }
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 px-4 py-10">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
            <Radio className="text-primary h-5 w-5" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Waiting for signals</p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              Matched tweets will stream here in real time as your alerts pick them up.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
