'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { LogOut, Settings } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

interface DashboardHeaderProps {
  userEmail?: string;
}

export function DashboardHeader({ userEmail }: DashboardHeaderProps) {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push('/');
  }

  return (
    <header className="bg-background/85 fixed top-0 right-0 left-0 z-50 border-b border-white/[0.08] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 lg:px-10">
        <Logo href="/dashboard" />

        <div className="flex items-center gap-2">
          {userEmail && (
            <span className="text-ink-muted hidden font-mono text-xs lg:inline">{userEmail}</span>
          )}
          <Button asChild variant="ghost" size="sm">
            <Link href="/settings">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign out</AlertDialogTitle>
                <AlertDialogDescription>Are you sure you want to sign out?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSignOut}>Sign out</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </header>
  );
}
