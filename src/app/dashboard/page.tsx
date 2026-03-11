import { Suspense } from 'react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardTitleRow } from '@/components/dashboard/dashboard-title-row';
import { ModernDashboard } from '@/components/dashboard/modern-dashboard';
import { TelegramQrConnect } from '@/components/telegram/telegram-qr-connect';
import { redirect } from 'next/navigation';
import { getOptionalSession } from '@/lib/api/auth';
import { getSocialAlertsWithStats } from '@/actions/alerts/lib/queries';
import { getPriceAlertsWithStats } from '@/actions/alerts/lib/price-queries';
import { getWalletAlertsWithStats } from '@/actions/wallets/lib/queries';
import { generateConnectToken } from '@/lib/telegram-connect-token';
import { createServiceSupabaseClient } from '@/lib/supabase/server';
import { getUserPlan, getUserAlertCount, getPlanLimits } from '@/lib/config/plans';

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
  const [initialAlerts, initialPriceAlerts, initialWalletAlerts, plan, alertCount] =
    await Promise.all([
      getSocialAlertsWithStats(supabase, userId),
      getPriceAlertsWithStats(supabase, userId),
      getWalletAlertsWithStats(supabase, userId),
      getUserPlan(userId),
      getUserAlertCount(userId),
    ]);
  const limits = getPlanLimits(plan);
  return (
    <ModernDashboard
      userId={userId}
      initialAlerts={initialAlerts}
      initialPriceAlerts={initialPriceAlerts}
      initialWalletAlerts={initialWalletAlerts}
      planInfo={{ plan: limits.label, usage: alertCount, limit: limits.maxAlerts }}
    />
  );
}

export default async function DashboardPage() {
  const { session } = await getOptionalSession();

  if (!session?.user.id) {
    redirect('/auth');
  }

  const supabase = createServiceSupabaseClient();
  const { data: telegramSettings } = await supabase
    .from('user_telegram_settings')
    .select('status')
    .eq('user_id', session.user.id)
    .single();

  const isTelegramConnected = telegramSettings?.status === 'connected';

  return (
    <DashboardShell>
      <div className="space-y-6">
        <DashboardHeader userEmail={session.user.email} />
        <DashboardTitleRow userId={session.user.id} />
        <TelegramQrConnect
          connectLink={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'CryptoSentryBot'}?start=${generateConnectToken(session.user.id)}`}
          isConnected={isTelegramConnected}
        />
        <Suspense fallback={<ContentSkeleton />}>
          <AlertsContent userId={session.user.id} />
        </Suspense>
      </div>
    </DashboardShell>
  );
}
