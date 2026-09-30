'use client';

import NextLink from 'next/link';
import { LogoMark } from '@/components/ui/logo';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';

const NAV = [
  { href: '#how', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
];

export default function LandingHeader() {
  const { user } = useUser();

  return (
    <header className="bg-background/70 fixed top-0 z-50 w-full border-b border-white/[0.08] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 lg:px-10">
        <NextLink href="/" className="flex items-center gap-2.5">
          <LogoMark size={22} />
          <span className="font-display text-[17px] font-semibold tracking-tight">
            CryptoSentry
          </span>
        </NextLink>

        <nav className="text-ink-muted hidden items-center gap-8 text-sm md:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Button asChild size="sm">
              <NextLink href="/dashboard">Go to dashboard</NextLink>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <NextLink href="/auth">Sign in</NextLink>
              </Button>
              <Button asChild size="sm" className="text-[#06110A]">
                <NextLink href="/auth?register=true">Start free</NextLink>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
