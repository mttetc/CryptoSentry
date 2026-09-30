'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send } from 'lucide-react';
import { feedSlideIn, alertBadgePop, toastSlideUp } from './animations';

interface Tweet {
  handle: string;
  time: string;
  text: string;
  tokens: string[];
  match: string | null;
  skipped?: string;
  avatar: string;
}

const TWEETS: Tweet[] = [
  {
    handle: '@CryptoGems',
    time: '09:41:07',
    text: 'Rotating into $SOL perps this week. Ecosystem volume is back, watch the breakout.',
    tokens: ['$SOL'],
    match: '$SOL',
    avatar: 'linear-gradient(135deg, #2F6B4A, #173A29)',
  },
  {
    handle: '@OnChainDesk',
    time: '09:41:52',
    text: '@someone yes, we covered that yesterday.',
    tokens: [],
    match: null,
    skipped: 'reply · skipped',
    avatar: '#1D2724',
  },
  {
    handle: '@OnChainDesk',
    time: '09:43:10',
    text: 'Fresh inflows into the spot ETF complex this morning. Highest since June.',
    tokens: ['spot ETF'],
    match: '"spot etf"',
    avatar: 'linear-gradient(135deg, #6B5A2F, #3A3117)',
  },
  {
    handle: '@CryptoGems',
    time: '09:44:26',
    text: 'Market looking heavy, sitting this one out.',
    tokens: [],
    match: null,
    skipped: 'no keyword',
    avatar: 'linear-gradient(135deg, #2F6B4A, #173A29)',
  },
];

const RULES = [
  { account: 'cryptogems', terms: ['$sol', '$pepe'], suffix: '-is:retweet -is:reply' },
  { account: 'onchaindesk', terms: ['"spot etf"', '$btc'], suffix: '-is:retweet' },
];

const STEP_MS = 2600;

function highlightTokens(text: string, tokens: string[]) {
  if (tokens.length === 0) {
    return text;
  }
  const parts: (string | { token: string; key: string })[] = [];
  let remaining = text;
  let keyIdx = 0;

  for (const token of tokens) {
    const idx = remaining.indexOf(token);
    if (idx !== -1) {
      if (idx > 0) {
        parts.push(remaining.slice(0, idx));
      }
      parts.push({ token, key: `${token}-${keyIdx++}` });
      remaining = remaining.slice(idx + token.length);
    }
  }
  if (remaining) {
    parts.push(remaining);
  }

  return parts.map((part) =>
    typeof part === 'string' ? (
      part
    ) : (
      <span key={part.key} className="text-primary font-semibold">
        {part.token}
      </span>
    )
  );
}

export default function HeroFeed() {
  const [visible, setVisible] = useState<number[]>([]);
  const [badges, setBadges] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<number | null>(null);
  const [cycle, setCycle] = useState(0);

  const restart = useCallback(() => {
    setVisible([]);
    setBadges(new Set());
    setToast(null);
    setCycle((c) => c + 1);
  }, []);

  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    TWEETS.forEach((tweet, i) => {
      timeouts.push(
        setTimeout(() => {
          setVisible((prev) => [...prev, i]);
          timeouts.push(
            setTimeout(() => {
              setBadges((prev) => new Set(prev).add(i));
            }, 500)
          );
          if (tweet.match) {
            timeouts.push(
              setTimeout(() => {
                setToast(i);
                timeouts.push(
                  setTimeout(() => {
                    setToast(null);
                  }, 1600)
                );
              }, 900)
            );
          }
        }, i * STEP_MS)
      );
    });

    timeouts.push(setTimeout(restart, TWEETS.length * STEP_MS + 2200));

    return () => {
      timeouts.forEach((t) => {
        clearTimeout(t);
      });
    };
  }, [cycle, restart]);

  return (
    <div className="relative mx-auto w-full max-w-[600px]">
      <div className="bg-surface relative overflow-hidden rounded-2xl border border-white/[0.12] shadow-[0_30px_80px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.05)]">
        {/* Window chrome */}
        <div className="text-ink-muted flex h-11 items-center justify-between border-b border-white/[0.08] px-4 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#2A3531]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#2A3531]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#2A3531]" />
            <span className="ml-2">sentry · live feed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-primary h-1.5 w-1.5 rounded-full" />
            connected · {RULES.length} rules
          </div>
        </div>

        {/* Rules */}
        <div className="flex flex-col gap-2 border-b border-white/[0.08] px-4 py-3.5">
          {RULES.map((rule) => (
            <div
              key={rule.account}
              className="text-ink-soft inline-flex max-w-full items-center gap-2 self-start overflow-hidden rounded-md border border-white/[0.08] bg-white/[0.05] px-2.5 py-1.5 font-mono text-xs whitespace-nowrap"
            >
              <span className="text-ink-muted">rule</span>
              <span className="truncate">
                from:{rule.account} (
                {rule.terms.map((term, i) => (
                  <span key={term}>
                    {i > 0 && ' OR '}
                    <span className="text-primary">{term}</span>
                  </span>
                ))}
                ) {rule.suffix}
              </span>
            </div>
          ))}
        </div>

        {/* Feed */}
        <div className="h-[290px] overflow-hidden px-4 pt-1.5 pb-4">
          <AnimatePresence mode="sync">
            {visible.map((idx) => {
              const tweet = TWEETS[idx];
              return (
                <motion.div
                  key={`${cycle}-${idx}`}
                  variants={feedSlideIn}
                  initial="hidden"
                  animate="visible"
                  className={
                    tweet.match
                      ? 'flex gap-3 border-b border-white/[0.06] py-3 last:border-0'
                      : 'flex gap-3 border-b border-white/[0.06] py-3 opacity-55 last:border-0'
                  }
                >
                  <div
                    className="h-8 w-8 shrink-0 rounded-full"
                    style={{ background: tweet.avatar }}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate font-mono text-[13px]">
                        {tweet.handle} <span className="text-ink-muted">· {tweet.time}</span>
                      </span>
                      <AnimatePresence>
                        {badges.has(idx) && (
                          <motion.span
                            variants={alertBadgePop}
                            initial="hidden"
                            animate="visible"
                            className={
                              tweet.match
                                ? 'text-primary shrink-0 rounded bg-[rgba(34,197,94,0.14)] px-2 py-0.5 font-mono text-[11px]'
                                : 'text-ink-muted shrink-0 rounded bg-white/[0.06] px-2 py-0.5 font-mono text-[11px]'
                            }
                          >
                            {tweet.match ? `MATCH · ${tweet.match}` : tweet.skipped}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                    <p className="text-ink-soft m-0 text-sm leading-relaxed">
                      {highlightTokens(tweet.text, tweet.tokens)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Telegram notification overlapping the console */}
      <AnimatePresence>
        {toast !== null && TWEETS[toast] && (
          <motion.div
            variants={toastSlideUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-surface-2 absolute -right-2 bottom-5 flex w-[320px] max-w-[92%] flex-col gap-2.5 rounded-xl border border-[rgba(34,197,94,0.35)] px-4 py-3.5 shadow-[0_24px_60px_rgba(0,0,0,0.6)] md:-right-6"
          >
            <div className="flex items-center gap-2.5">
              <div className="bg-primary flex h-7 w-7 items-center justify-center rounded-full text-[#06110A]">
                <Send className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-semibold">CryptoSentry</span>
                <span className="text-ink-muted font-mono text-[11px]">
                  Telegram · delivered in 1.4 s
                </span>
              </div>
            </div>
            <p className="text-ink-soft m-0 text-[13px] leading-snug">
              <strong className="text-foreground">{TWEETS[toast].handle}</strong> mentioned{' '}
              <span className="text-primary">{TWEETS[toast].match}</span>
            </p>
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-primary inline-flex items-center gap-1.5">
                <span className="bg-primary h-2 w-2 rounded-full" />
                bullish
              </span>
              <span className="text-ink-muted">Open on X</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
