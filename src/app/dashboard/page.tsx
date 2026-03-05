import { Suspense } from 'react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { ModernDashboard } from '@/components/dashboard/modern-dashboard';
import { MonitoringStream } from '@/components/monitoring/MonitoringStream';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user.id) {
    return <div>Please log in to access the dashboard.</div>;
  }

  return (
    <DashboardShell>
      <Suspense fallback={<div className="h-[200px] animate-pulse rounded-md bg-muted" />}>
        <ModernDashboard userId={session.user.id} />
      </Suspense>

      {/* Background monitoring stream for real-time updates */}
      <MonitoringStream />
    </DashboardShell>
  );
}
