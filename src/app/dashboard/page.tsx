import { Suspense } from 'react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { ModernDashboard } from '@/components/dashboard/modern-dashboard';
import { MonitoringStream } from '@/components/monitoring/MonitoringStream';
import { getOptionalSession } from '@/lib/api/auth';
import { getSocialAlertsWithStats } from '@/actions/alerts/lib/queries';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { session } = await getOptionalSession();

  if (!session?.user.id) {
    return <div>Please log in to access the dashboard.</div>;
  }

  const initialAlerts = await getSocialAlertsWithStats(session.user.id);

  return (
    <DashboardShell>
      <Suspense fallback={<div className="h-[200px] animate-pulse rounded-md bg-muted" />}>
        <ModernDashboard userId={session.user.id} initialAlerts={initialAlerts} />
      </Suspense>

      {/* Background monitoring stream for real-time updates */}
      <MonitoringStream />
    </DashboardShell>
  );
}
