'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Candlestick illustration: candles form one after another, each growing from its open (the
 * previous close) up or down to its close, and the last one makes the move. Every cycle draws
 * a fresh random walk, so the chart never repeats. Green up, red down, candles touching.
 */

interface Candle {
  x: number;
  open: number;
  close: number;
  high: number;
  low: number;
}

const COUNT = 14;
const BODY_W = 30;
const STEP = 34;
const WIDTH = 500;
const HEIGHT = 240;
const BASELINE = 218;
const TOP = 12;
const STEP_S = 0.32;
/** Must match --animate-candle in globals.css. */
const CYCLE_MS = 12_000;

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Random walk with a bias to alternate, kept on the canvas, ending on a big up move. */
export function generateCandles(): Candle[] {
  const candles: Candle[] = [];
  let price = rand(110, 140);
  let lastUp = Math.random() > 0.5;

  for (let i = 0; i < COUNT; i++) {
    const open = price;
    const isLast = i === COUNT - 1;
    let close: number;

    if (isLast) {
      close = Math.max(TOP + 8, open - rand(55, 85));
    } else {
      // Alternate more often than not, with a couple of same-direction runs
      const up = Math.random() < 0.7 ? !lastUp : lastUp;
      const size = rand(8, 34);
      close = up ? open - size : open + size;
      // Keep the series inside the canvas, leaving room for the final move
      close = Math.min(Math.max(close, 60), 175);
      lastUp = close < open;
    }

    const up = close < open;
    const bodyTop = Math.min(open, close);
    const bodyBottom = Math.max(open, close);
    candles.push({
      x: 18 + BODY_W / 2 + i * STEP,
      open,
      close,
      high: Math.max(TOP - 8, bodyTop - rand(3, up ? 12 : 6)),
      low: Math.min(BASELINE - 4, bodyBottom + rand(3, up ? 6 : 12)),
    });
    price = close;
  }

  return candles;
}

/** Deterministic series for the server render; replaced on the client after mount. */
const INITIAL: Candle[] = [96, 116, 82, 108, 130, 90, 110, 66, 96, 56, 104, 74, 50, 12].map(
  (close, i, all) => {
    const open = i === 0 ? 124 : all[i - 1];
    const up = close < open;
    return {
      x: 18 + BODY_W / 2 + i * STEP,
      open,
      close,
      high: Math.min(open, close) - (up ? 9 : 5),
      low: Math.max(open, close) + (up ? 5 : 9),
    };
  }
);

export function ChartArt({ className }: { className?: string }) {
  const [candles, setCandles] = useState<Candle[]>(INITIAL);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setCandles(generateCandles());
    if (reduce) {
      return;
    }
    const timer = setInterval(() => {
      setCandles(generateCandles());
      setCycle((c) => c + 1);
    }, CYCLE_MS);
    return () => clearInterval(timer);
  }, []);

  const last = candles.length - 1;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      className={cn('h-auto w-full', className)}
      aria-hidden="true"
    >
      <path d={`M0 ${BASELINE + 0.5}H${WIDTH}`} stroke="#EAF0EC" strokeOpacity="0.16" />

      {/* Remounting on each cycle restarts every CSS animation from zero */}
      <g key={cycle}>
        {candles.map((c, i) => {
          const isLast = i === last;
          const up = c.close < c.open;
          const color = up ? '#22C55E' : '#F0645A';
          const top = Math.min(c.open, c.close);
          const height = Math.max(Math.abs(c.open - c.close), 2);
          return (
            <g
              key={`${cycle}-${i}`}
              className="animate-candle motion-reduce:animate-none"
              style={{
                animationDelay: `${i * STEP_S + (isLast ? 1.2 : 0)}s`,
                transformOrigin: `${c.x}px ${c.open}px`,
                transformBox: 'view-box',
              }}
            >
              <path
                d={`M${c.x} ${c.high}V${c.low}`}
                stroke={color}
                strokeWidth={2}
                strokeOpacity={isLast ? 1 : 0.8}
              />
              <rect
                x={c.x - BODY_W / 2}
                y={top}
                width={BODY_W}
                height={height}
                rx={1.5}
                fill={color}
                fillOpacity={isLast ? 1 : 0.85}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
