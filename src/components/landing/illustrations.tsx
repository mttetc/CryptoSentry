import { cn } from '@/lib/utils';

/**
 * Small inline SVG illustrations for the feature list. Monoline, inherit the text color, one
 * green accent each. Animated with CSS keyframes declared in globals.css; every animation is
 * disabled under prefers-reduced-motion via `motion-reduce:animate-none`.
 */

interface ArtProps {
  className?: string;
}

const base = 'h-12 w-12 shrink-0 text-ink-soft';
const stroke = { stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const };

/** Posts flowing along three lanes. */
export function StreamArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn(base, className)} aria-hidden="true">
      <path d="M6 16h36" {...stroke} strokeOpacity="0.25" />
      <path d="M6 24h36" {...stroke} strokeOpacity="0.25" />
      <path d="M6 32h36" {...stroke} strokeOpacity="0.25" />
      <path
        d="M6 16h36"
        {...stroke}
        strokeWidth={2.5}
        strokeDasharray="4 20"
        className="animate-stream motion-reduce:animate-none"
      />
      <path
        d="M6 24h36"
        stroke="#22C55E"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray="4 20"
        className="animate-stream motion-reduce:animate-none"
        style={{ animationDelay: '-0.6s' }}
      />
      <path
        d="M6 32h36"
        {...stroke}
        strokeWidth={2.5}
        strokeDasharray="4 20"
        className="animate-stream motion-reduce:animate-none"
        style={{ animationDelay: '-1.1s' }}
      />
    </svg>
  );
}

/** A sentiment dial whose needle swings from bearish to bullish. */
export function SentimentArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn(base, className)} aria-hidden="true">
      <path d="M8 32a16 16 0 0 1 32 0" {...stroke} strokeOpacity="0.35" />
      <path d="M8 32a16 16 0 0 1 6-12.5" stroke="#F0645A" strokeWidth={1.5} strokeLinecap="round" />
      <path
        d="M34 19.5a16 16 0 0 1 6 12.5"
        stroke="#22C55E"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <g
        className="animate-needle motion-reduce:animate-none"
        style={{ transformOrigin: '24px 32px', transformBox: 'view-box' }}
      >
        <path d="M24 32V19" {...stroke} strokeWidth={2} />
        <circle cx="24" cy="32" r="2" fill="currentColor" />
      </g>
    </svg>
  );
}

/** A price line drawing itself across a dashed target, the crossing point pings. */
export function PriceArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn(base, className)} aria-hidden="true">
      <path
        d="M6 20h36"
        stroke="#E8B04B"
        strokeWidth={1.5}
        strokeDasharray="3 4"
        strokeOpacity="0.8"
      />
      <path
        d="M6 34l7-4 6 3 6-8 6 2 5-9 6 2"
        {...stroke}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeDasharray="60"
        className="animate-draw motion-reduce:animate-none"
      />
      <circle
        cx="31.5"
        cy="20"
        r="2.5"
        fill="#22C55E"
        className="animate-ping-soft motion-reduce:animate-none"
        style={{ transformOrigin: '31.5px 20px', transformBox: 'view-box' }}
      />
    </svg>
  );
}

/** Word boundaries: brackets closing on the whole word only. */
export function BoundaryArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn(base, className)} aria-hidden="true">
      <rect x="15" y="20" width="18" height="8" rx="2" fill="currentColor" fillOpacity="0.18" />
      <path d="M17 24h14" stroke="#22C55E" strokeWidth={2} strokeLinecap="round" />
      <g
        className="animate-pinch motion-reduce:animate-none"
        style={{ transformOrigin: '24px 24px', transformBox: 'view-box' }}
      >
        <path d="M12 16v16" {...stroke} strokeWidth={2} />
        <path d="M36 16v16" {...stroke} strokeWidth={2} />
      </g>
      <path d="M6 24h3M39 24h3" {...stroke} strokeOpacity="0.35" />
    </svg>
  );
}

/** One source, four channels lighting up in turn. */
export function ChannelsArt({ className }: ArtProps) {
  const targets = [10, 19.5, 28.5, 38];
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn(base, className)} aria-hidden="true">
      {targets.map((y) => (
        <path key={y} d={`M12 24C22 24 26 ${y} 36 ${y}`} {...stroke} strokeOpacity="0.3" />
      ))}
      <circle cx="10" cy="24" r="3" fill="#22C55E" />
      {targets.map((y, i) => (
        <circle
          key={y}
          cx="38"
          cy={y}
          r="2.5"
          fill="currentColor"
          className="animate-fan motion-reduce:animate-none"
          style={{ animationDelay: `${i * 0.35}s` }}
        />
      ))}
    </svg>
  );
}

/** Code brackets with a blinking cursor. */
export function ApiArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn(base, className)} aria-hidden="true">
      <path d="M16 14l-8 10 8 10" {...stroke} strokeWidth={2} strokeLinejoin="round" />
      <path d="M32 14l8 10-8 10" {...stroke} strokeWidth={2} strokeLinejoin="round" />
      <rect
        x="22.5"
        y="17"
        width="3"
        height="14"
        rx="0.5"
        fill="#22C55E"
        className="animate-blink motion-reduce:animate-none"
      />
    </svg>
  );
}

interface Candle {
  x: number;
  open: number;
  close: number;
  high: number;
  low: number;
}

/**
 * A close-to-close series: each candle opens where the previous one closed. Y grows downwards,
 * hence close < open is an up candle. The last one is the move the signal announced.
 */
const CLOSES = [96, 116, 82, 108, 130, 90, 110, 66, 96, 56, 104, 74, 50, 12];
const BODY_W = 30;
const STEP = 34;
const BASELINE = 218;
const HERO_STEP_S = 0.32;

const CANDLES: Candle[] = CLOSES.map((close, i) => {
  const open = i === 0 ? 124 : CLOSES[i - 1];
  const up = close < open;
  return {
    x: 18 + BODY_W / 2 + i * STEP,
    open,
    close,
    high: Math.min(open, close) - (up ? 9 : 5),
    low: Math.max(open, close) + (up ? 5 : 9),
  };
});

/**
 * Section illustration: candles form one after another, each growing from its open (the
 * previous close) up or down to its close, then the last one makes the move. Green up, red
 * down, candles touching like a chart. Loops with a long hold.
 */
export function ChartArt({ className }: ArtProps) {
  const last = CANDLES.length - 1;
  return (
    <svg
      viewBox="0 0 500 240"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      className={cn('h-auto w-full', className)}
      aria-hidden="true"
    >
      <path d={`M0 ${BASELINE + 0.5}H500`} stroke="#EAF0EC" strokeOpacity="0.16" />

      {CANDLES.map((c, i) => {
        const isLast = i === last;
        const up = c.close < c.open;
        const color = up ? '#22C55E' : '#F0645A';
        const top = Math.min(c.open, c.close);
        const height = Math.max(Math.abs(c.open - c.close), 2);
        return (
          <g
            key={c.x}
            className="animate-candle motion-reduce:animate-none"
            style={{
              animationDelay: `${i * HERO_STEP_S + (isLast ? 1.2 : 0)}s`,
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
    </svg>
  );
}
