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
      <path d="M22 4.5v4.5M22 23v4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="18" y="9" width="8" height="14" rx="1.5" stroke="currentColor" strokeWidth="2" />
      {/* Signal: ping and its wave, ahead of the candle */}
      <path
        d="M8 3a7 7 0 0 1 7 7"
        stroke="currentColor"
        strokeOpacity="0.55"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="8" cy="10" r="3" fill="#22C55E" />
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
