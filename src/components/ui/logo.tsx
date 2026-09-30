import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BrandDot } from './brand-dot';

/** Wordmark only: display face, two weights, a living green pixel as the full stop. */
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
      <BrandDot />
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
