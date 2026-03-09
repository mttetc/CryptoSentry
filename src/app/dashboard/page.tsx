import { Suspense } from 'react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { ModernDashboard } from '@/components/dashboard/modern-dashboard';
import { getOptionalSession } from '@/lib/api/auth';
import { getSocialAlertsWithStats } from '@/actions/alerts/lib/queries';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { supabase, session } = await getOptionalSession();

  if (!session?.user.id || !supabase) {
    return <div>Please log in to access the dashboard.</div>;
  }

  const initialAlerts = await getSocialAlertsWithStats(supabase, session.user.id);

  return (
    <DashboardShell>
      <Suspense fallback={<div className="h-[200px] animate-pulse rounded-md bg-muted" />}>
        <ModernDashboard
          userId={session.user.id}
          userEmail={session.user.email}
          initialAlerts={initialAlerts}
        />
      </Suspense>
    </DashboardShell>
  );
}
