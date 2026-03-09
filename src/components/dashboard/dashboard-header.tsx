'use client';

import Link from 'next/link';
import { LogoMark } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

interface DashboardHeaderProps {
  userEmail?: string;
}

export function DashboardHeader({ userEmail }: DashboardHeaderProps) {
  return (
    <header className="bg-background/80 fixed top-0 right-0 left-0 z-50 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark size={20} />
          <span className="text-sm font-semibold tracking-tight">CryptoSentry</span>
        </Link>

        {/* Badges slot — filled via portal by ModernDashboard once data loads */}
        <div id="dashboard-header-badges" className="hidden items-center gap-3 md:flex" />

        <div className="flex items-center gap-4">
          {userEmail && (
            <span className="text-muted-foreground hidden text-sm lg:inline">{userEmail}</span>
          )}
          <Button variant="ghost" size="sm" onClick={() => authClient.signOut()}>
            <LogOut className="mr-1.5 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
