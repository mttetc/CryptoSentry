'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { feedSlideIn, alertBadgePop, toastSlideUp } from './animations';

interface Tweet {
  handle: string;
  text: string;
  tokens: string[];
  hasAlert: boolean;
}

const TWEETS: Tweet[] = [
  {
    handle: '@CryptoGems',
    text: 'Just aped into $PEPE. This chart looks insane.',
    tokens: ['$PEPE'],
    hasAlert: true,
  },
  {
    handle: '@DegenTrader',
    text: 'Market looking weak today, not touching anything.',
    tokens: [],
    hasAlert: false,
  },
  {
    handle: '@AltcoinDaily',
    text: '$SOL ecosystem heating up. Watch $JUP closely.',
    tokens: ['$SOL', '$JUP'],
    hasAlert: true,
  },
  {
    handle: '@whale_alert',
    text: '50,000,000 $USDT transferred from Binance to unknown wallet.',
    tokens: ['$USDT'],
    hasAlert: true,
  },
  {
    handle: '@CryptoNoob',
    text: 'When does the bull market start? Asking for a friend.',
    tokens: [],
    hasAlert: false,
  },
];

function highlightTokens(text: string, tokens: string[]) {
  if (tokens.length === 0) { return text; }

  const parts: (string | { token: string; key: string })[] = [];
  let remaining = text;
  let keyIdx = 0;

  for (const token of tokens) {
    const idx = remaining.indexOf(token);
    if (idx !== -1) {
      if (idx > 0) { parts.push(remaining.slice(0, idx)); }
      parts.push({ token, key: `${token}-${keyIdx++}` });
      remaining = remaining.slice(idx + token.length);
    }
  }
  if (remaining) { parts.push(remaining); }

  return parts.map((part) =>
    typeof part === 'string' ? (
      part
    ) : (
      <span key={part.key} className="font-semibold text-sentry-green">
        {part.token}
      </span>
    )
  );
}

export default function HeroFeed() {
  const [visibleTweets, setVisibleTweets] = useState<number[]>([]);
  const [alertShown, setAlertShown] = useState<Set<number>>(new Set());
  const [toastTweet, setToastTweet] = useState<number | null>(null);
  const [cycle, setCycle] = useState(0);

  const resetAndRestart = useCallback(() => {
    setVisibleTweets([]);
    setAlertShown(new Set());
    setToastTweet(null);
    setCycle((c) => c + 1);
  }, []);

  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    TWEETS.forEach((tweet, i) => {
      // Show tweet
      timeouts.push(
        setTimeout(() => {
          setVisibleTweets((prev) => [...prev, i]);

          // Show alert badge after 600ms delay
          if (tweet.hasAlert) {
            timeouts.push(
              setTimeout(() => {
                setAlertShown((prev) => new Set(prev).add(i));
              }, 600)
            );

            // Show toast after 1s
            timeouts.push(
              setTimeout(() => {
                setToastTweet(i);
                // Hide toast after 1.5s
                timeouts.push(
                  setTimeout(() => {
                    setToastTweet(null);
                  }, 1500)
                );
              }, 1000)
            );
          }
        }, i * 2500)
      );
    });

    // Restart loop after all tweets + pause
    timeouts.push(
      setTimeout(() => {
        resetAndRestart();
      }, TWEETS.length * 2500 + 2000)
    );

    return () => { timeouts.forEach((t) => { clearTimeout(t); }); };
  }, [cycle, resetAndRestart]);

  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-lg border border-white/10 bg-[#111111]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <div className="h-2 w-2 rounded-full bg-sentry-green" />
        <span className="font-mono text-sm text-neutral-400">Live Feed</span>
      </div>

      {/* Feed */}
      <div className="h-[380px] overflow-hidden px-4 py-3">
        <AnimatePresence mode="sync">
          {visibleTweets.map((tweetIdx) => {
            const tweet = TWEETS[tweetIdx];
            return (
              <motion.div
                key={`${cycle}-${tweetIdx}`}
                variants={feedSlideIn}
                initial="hidden"
                animate="visible"
                className="mb-4 last:mb-0"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-sm font-medium text-sentry-green">
                      {tweet.handle}
                    </span>
                    <p className="mt-1 text-sm leading-relaxed text-neutral-300">
                      {highlightTokens(tweet.text, tweet.tokens)}
                    </p>
                  </div>
                  <AnimatePresence>
                    {tweet.hasAlert && alertShown.has(tweetIdx) && (
                      <motion.span
                        variants={alertBadgePop}
                        initial="hidden"
                        animate="visible"
                        className="ml-3 shrink-0 rounded bg-sentry-green/15 px-2 py-0.5 font-mono text-xs text-sentry-green"
                      >
                        CALLING
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Telegram call toast */}
      <AnimatePresence>
        {toastTweet !== null && TWEETS[toastTweet] && (
          <motion.div
            variants={toastSlideUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute bottom-4 left-4 right-4 rounded-lg border border-sentry-green/20 bg-[#1a1a1a] px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sentry-green/20">
                <svg className="h-4 w-4 text-sentry-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">CryptoSentry</p>
                <p className="text-xs text-sentry-green">
                  {TWEETS[toastTweet].tokens[0]} mentioned by {TWEETS[toastTweet].handle}
                </p>
              </div>
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-sentry-green" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
