import { Suspense } from 'react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardTitleRow } from '@/components/dashboard/dashboard-title-row';
import { ModernDashboard } from '@/components/dashboard/modern-dashboard';
import { TelegramQrConnect } from '@/components/telegram/telegram-qr-connect';
import { getOptionalSession } from '@/lib/api/auth';
import { getSocialAlertsWithStats } from '@/actions/alerts/lib/queries';
import { generateConnectToken } from '@/lib/telegram-connect-token';

export const dynamic = 'force-dynamic';

function CardSkeleton() {
  return (
    <div className="rounded-xl border p-4">
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
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex gap-1">
          <div className="bg-muted h-5 w-14 animate-pulse rounded-full" />
          <div className="bg-muted h-5 w-18 animate-pulse rounded-full" />
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

function ContentSkeleton() {
  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="lg:w-[350px] lg:shrink-0">
        <FeedSkeleton />
      </div>
    </div>
  );
}

async function AlertsContent({ userId }: { userId: string }) {
  const { supabase } = await getOptionalSession();
  if (!supabase) {
    return null;
  }
  const initialAlerts = await getSocialAlertsWithStats(supabase, userId);
  return <ModernDashboard userId={userId} initialAlerts={initialAlerts} />;
}

export default async function DashboardPage() {
  const { session } = await getOptionalSession();

  if (!session?.user.id) {
    return <div>Please log in to access the dashboard.</div>;
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <DashboardHeader userEmail={session.user.email} />
        <DashboardTitleRow userId={session.user.id} />
        <TelegramQrConnect
          connectLink={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'CryptoSentryBot'}?start=${generateConnectToken(session.user.id)}`}
        />
        <Suspense fallback={<ContentSkeleton />}>
          <AlertsContent userId={session.user.id} />
        </Suspense>
      </div>
    </DashboardShell>
  );
}
