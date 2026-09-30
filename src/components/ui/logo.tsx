import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Brand mark: the signal before the candle.
 * A quiet candle, then the move: a full green candle. Two shapes, no ornament; the grey
 * candle inherits the text color.
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
      {/* Before: a small, quiet candle */}
      <path
        d="M10 14.5V17M10 24v2.5"
        stroke="currentColor"
        strokeOpacity="0.5"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="7"
        y="17"
        width="6"
        height="7"
        rx="1.25"
        stroke="currentColor"
        strokeOpacity="0.5"
        strokeWidth="2"
      />
      {/* After: the move */}
      <path d="M23 3.5V7.5M23 24.5v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="19" y="7.5" width="8" height="17" rx="1.5" fill="#22C55E" />
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
