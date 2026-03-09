'use client';

import NextLink from 'next/link';
import { LogoMark } from '@/components/ui/logo';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';

export default function LandingHeader() {
  const { user } = useUser();

  return (
    <header className="fixed top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <NextLink href="/" className="flex items-center gap-2">
          <LogoMark size={20} />
          <span className="text-sm font-semibold tracking-tight">CryptoSentry</span>
        </NextLink>

        <nav className="flex items-center gap-3">
          {user ? (
            <Button asChild size="sm">
              <NextLink href="/dashboard">Go to Dashboard</NextLink>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <NextLink href="/auth">Sign In</NextLink>
              </Button>
              <Button asChild size="sm">
                <NextLink href="/auth?register=true">Get Started</NextLink>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
