'use client';

import { CreateAlertDialog } from './create-alert-dialog';
import type { OptimisticAlertData } from './create-alert-form';

interface DashboardTitleRowProps {
  userId: string;
}

function handleAlertCreated(data: OptimisticAlertData) {
  window.dispatchEvent(new CustomEvent('alert-created', { detail: data }));
}

export function DashboardTitleRow({ userId }: DashboardTitleRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="bg-primary h-2 w-2 rounded-full" />
        <h2 className="text-lg font-semibold tracking-tight">Your Alerts</h2>
      </div>

      <div className="flex items-center gap-3">
        <div id="dashboard-account-filter" />
        <CreateAlertDialog userId={userId} onAlertCreated={handleAlertCreated} />
      </div>
    </div>
  );
}
