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

// Twelve candles on a quiet drift, the last one is the move the signal announced.
// Y grows downwards: close < open means the candle went up.
const CANDLES: Candle[] = [
  { x: 60, open: 138, close: 130, high: 124, low: 142 },
  { x: 150, open: 130, close: 136, high: 126, low: 141 },
  { x: 240, open: 136, close: 124, high: 119, low: 139 },
  { x: 330, open: 124, close: 129, high: 118, low: 134 },
  { x: 420, open: 129, close: 116, high: 111, low: 132 },
  { x: 510, open: 116, close: 121, high: 110, low: 126 },
  { x: 600, open: 121, close: 112, high: 106, low: 124 },
  { x: 690, open: 112, close: 118, high: 108, low: 122 },
  { x: 780, open: 118, close: 108, high: 102, low: 121 },
  { x: 870, open: 108, close: 112, high: 103, low: 116 },
  { x: 960, open: 112, close: 106, high: 100, low: 115 },
  { x: 1080, open: 106, close: 44, high: 36, low: 110 },
];

const HERO_STEP_S = 0.45;
const BODY_W = 14;

/**
 * Full-width hero illustration: a candlestick chart draws itself candle by candle, then the
 * last one makes the move. Loops with a long hold.
 * Past candles share one muted tone: hollow when they closed up, filled when they closed down.
 */
export function HeroChartArt({ className }: ArtProps) {
  const last = CANDLES.length - 1;
  return (
    <svg
      viewBox="0 0 1200 200"
      preserveAspectRatio="xMidYMax slice"
      fill="none"
      className={cn('text-ink-soft h-full w-full', className)}
      aria-hidden="true"
    >
      <path d="M0 176.5H1200" stroke="currentColor" strokeOpacity="0.16" />

      {CANDLES.map((c, i) => {
        const isLast = i === last;
        const up = c.close < c.open;
        const top = Math.min(c.open, c.close);
        const height = Math.max(Math.abs(c.open - c.close), 2);
        let bodyFill = 'currentColor';
        if (isLast) {
          bodyFill = '#22C55E';
        } else if (up) {
          bodyFill = 'none';
        }
        return (
          <g
            key={c.x}
            className="animate-candle motion-reduce:animate-none"
            style={{
              animationDelay: `${i * HERO_STEP_S + (isLast ? 1.4 : 0)}s`,
              transformOrigin: `${c.x}px 176px`,
              transformBox: 'view-box',
            }}
          >
            <path
              d={`M${c.x} ${c.high}V${c.low}`}
              stroke={isLast ? '#22C55E' : 'currentColor'}
              strokeOpacity={isLast ? 0.9 : 0.45}
              strokeWidth={1}
            />
            <rect
              x={c.x - BODY_W / 2}
              y={top}
              width={BODY_W}
              height={height}
              rx={1.5}
              fill={bodyFill}
              fillOpacity={isLast ? 0.9 : 0.35}
              stroke={isLast ? '#22C55E' : 'currentColor'}
              strokeOpacity={isLast ? 1 : 0.45}
              strokeWidth={1}
            />
          </g>
        );
      })}
    </svg>
  );
}
