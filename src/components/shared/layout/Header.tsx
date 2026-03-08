'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-user';
import { Logo } from '@/components/ui/logo';
import { FEATURES } from '@/lib/config/features';

interface HeaderProps {
  children?: React.ReactNode;
}

function HeaderNav({ user, children }: { user: unknown; children?: React.ReactNode }) {
  if (FEATURES.isDevMode || user) {
    return (
      <Link href="/dashboard">
        <Button>Go to Dashboard</Button>
      </Link>
    );
  }

  if (FEATURES.isWaitlistMode) {
    return <>{children}</>;
  }

  return (
    <>
      <Link href="/auth">
        <Button variant="ghost">Sign In</Button>
      </Link>
      <Link href="/auth?register=true">
        <Button>Get Started</Button>
      </Link>
    </>
  );
}

export default function Header({ children }: HeaderProps) {
  const { user } = useUser();

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Logo />

        <nav className="flex items-center gap-4">
          <HeaderNav user={user}>{children}</HeaderNav>
        </nav>
      </div>
    </header>
  );
}
