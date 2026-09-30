import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Brand mark: the signal before the candle.
 * A green ping on the left, its wave reaching a candlestick on the right. Monoline, inherits
 * the text color; only the signal is brand green so it reads in any context.
 */
function LogoMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      {/* Candle: wick, body, wick */}
      <path d="M23 3.5V8M23 24v4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="19" y="8" width="8" height="16" rx="1.5" stroke="currentColor" strokeWidth="2" />
      {/* Signal: the ping and two waves travelling up to the candle */}
      <path
        d="M9 13.5a6.5 6.5 0 0 1 6.5 6.5"
        stroke="currentColor"
        strokeOpacity="0.75"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9 9.5a10.5 10.5 0 0 1 10.5 10.5"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="9" cy="20" r="3" fill="#22C55E" />
    </svg>
  );
}

/** Wordmark: display face, two weights, a single green pixel as the full stop. */
function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'font-display inline-flex items-baseline text-[17px] leading-none tracking-[-0.02em]',
        className
      )}
    >
      <span className="font-medium">Crypto</span>
      <span className="font-bold">Sentry</span>
      <span
        aria-hidden
        className="bg-primary ml-[3px] inline-block h-[5px] w-[5px] rounded-[1px]"
      />
    </span>
  );
}

interface LogoProps {
  href?: string;
  size?: number;
  className?: string;
}

function Logo({ href = '/', size = 22, className }: LogoProps) {
  return (
    <Link
      href={href}
      aria-label="CryptoSentry"
      className={cn('text-foreground inline-flex items-center gap-2.5', className)}
    >
      <LogoMark size={size} />
      <Wordmark />
    </Link>
  );
}

export { Logo, LogoMark, Wordmark };
