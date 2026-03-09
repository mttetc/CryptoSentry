import Link from 'next/link';
import { LogoMark } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

function CompactCardSkeleton() {
  return (
    <div className="rounded-xl border p-4">
      {/* Row 1 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-muted h-4 w-24 animate-pulse rounded" />
          <div className="bg-muted h-5 w-14 animate-pulse rounded-full" />
        </div>
        <div className="flex items-center gap-1">
          <div className="bg-muted h-7 w-7 animate-pulse rounded" />
          <div className="bg-muted h-7 w-7 animate-pulse rounded" />
        </div>
      </div>
      {/* Row 2 */}
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex gap-1">
          <div className="bg-muted h-5 w-14 animate-pulse rounded-full" />
          <div className="bg-muted h-5 w-18 animate-pulse rounded-full" />
          <div className="bg-muted h-5 w-12 animate-pulse rounded-full" />
        </div>
        <div className="bg-muted h-3 w-20 animate-pulse rounded" />
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="rounded-xl border">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <div className="bg-primary h-2 w-2 animate-pulse rounded-full" />
        <span className="text-muted-foreground font-mono text-sm">Live Feed</span>
      </div>
      <div className="space-y-4 px-4 py-3">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="bg-muted h-4 w-28 animate-pulse rounded" />
            <div className="bg-muted mt-1.5 h-3 w-full animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Real header */}
        <header className="bg-background/80 fixed top-0 right-0 left-0 z-50 border-b backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-2">
              <LogoMark size={20} />
              <span className="text-sm font-semibold tracking-tight">CryptoSentry</span>
            </Link>
            <Button variant="ghost" size="sm" disabled>
              <LogOut className="mr-1.5 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </header>

        {/* Title row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary h-2 w-2 rounded-full" />
            <h2 className="text-lg font-semibold tracking-tight">Your Alerts</h2>
          </div>
          <div className="bg-muted h-9 w-28 animate-pulse rounded-lg" />
        </div>

        {/* Two-column layout skeleton */}
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <CompactCardSkeleton />
            <CompactCardSkeleton />
            <CompactCardSkeleton />
          </div>
          <div className="lg:w-[350px] lg:shrink-0">
            <FeedSkeleton />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
