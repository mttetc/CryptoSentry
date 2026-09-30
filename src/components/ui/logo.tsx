import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Wordmark only: display face, two weights, a single green pixel as the full stop. */
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
        className="bg-primary ml-[3px] inline-block h-[0.28em] w-[0.28em] rounded-[1px]"
      />
    </span>
  );
}

interface LogoProps {
  href?: string;
  className?: string;
}

function Logo({ href = '/', className }: LogoProps) {
  return (
    <Link
      href={href}
      aria-label="CryptoSentry"
      className={cn('text-foreground inline-flex items-center', className)}
    >
      <Wordmark />
    </Link>
  );
}

export { Logo, Wordmark };
