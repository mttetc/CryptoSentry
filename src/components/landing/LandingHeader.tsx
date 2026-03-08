'use client';

import Link from 'next/link';
import { LogoMark } from '@/components/ui/logo';

export default function LandingHeader() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark size={20} />
          <span className="text-sm font-semibold tracking-tight text-white">CryptoSentry</span>
        </Link>

        <nav className="flex items-center gap-3">
          <Link
            href="/auth"
            className="rounded px-3 py-1.5 text-sm text-neutral-400 transition-colors hover:text-white"
          >
            Sign In
          </Link>
          <Link
            href="/auth?register=true"
            className="rounded-lg bg-sentry-green px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-sentry-green/90"
          >
            Get Started
          </Link>
        </nav>
      </div>
    </header>
  );
}
