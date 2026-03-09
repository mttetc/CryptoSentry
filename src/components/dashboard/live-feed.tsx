'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import type { SocialAlertWithStats, AlertTweet } from '@/types/alerts';

interface LiveFeedProps {
  alerts: SocialAlertWithStats[];
  flashAlertIds?: Set<string>;
}

interface FeedItem extends AlertTweet {
  alertId: string;
  matchedKeywords: string[];
  callEnabled: boolean;
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

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items.slice(0, 50);
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
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            {highlightKeywords(
              item.text.length > 200 ? `${item.text.slice(0, 200)}...` : item.text,
              item.matchedKeywords
            )}
          </p>
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

export function LiveFeed({ alerts, flashAlertIds = new Set() }: LiveFeedProps) {
  const items = collectFeedItems(alerts);

  return (
    <div className="bg-card rounded-xl border">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <div className="bg-primary h-2 w-2 animate-pulse rounded-full" />
        <span className="text-muted-foreground font-mono text-sm">Live Feed</span>
      </div>
      {items.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-muted-foreground text-xs">No tweets yet. Matches will appear here.</p>
        </div>
      ) : (
        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto px-4 py-3">
          <AnimatePresence mode="popLayout">
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
      )}
    </div>
  );
}
