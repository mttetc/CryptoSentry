import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { WalletAlertWithStats } from '@/types/alerts';

export const getWalletAlertsWithStats = cache(async function getWalletAlertsWithStats(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<WalletAlertWithStats[]> {
  const { data: alerts, error } = await supabase
    .from('wallet_alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching wallet alerts:', error);
    return [];
  }

  if (!alerts || alerts.length === 0) {
    return [];
  }

  const alertIds = alerts.map((a) => a.id);
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: allTriggers } = await supabase
    .from('alert_triggers')
    .select('alert_id, triggered_at')
    .in('alert_id', alertIds)
    .gte('triggered_at', cutoff)
    .order('triggered_at', { ascending: false });

  const triggersByAlert = new Map<string, NonNullable<typeof allTriggers>>();
  for (const trigger of allTriggers ?? []) {
    const id = trigger.alert_id ?? '';
    const existing = triggersByAlert.get(id) ?? [];
    if (existing.length < 10) {
      existing.push(trigger);
    }
    triggersByAlert.set(id, existing);
  }

  return alerts.map((alert) => {
    const triggers = triggersByAlert.get(alert.id) ?? [];

    return {
      id: alert.id,
      user_id: alert.user_id,
      address: alert.address,
      label: alert.label,
      chain: alert.chain,
      min_value_usd: alert.min_value_usd,
      is_active: alert.is_active,
      created_at: alert.created_at,
      triggerCount: triggers.length,
      lastActivity: triggers[0]?.triggered_at ?? alert.created_at,
    };
  });
});
