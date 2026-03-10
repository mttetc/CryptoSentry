import type { SupabaseClient } from '@supabase/supabase-js';

export interface WalletAlertWithStats {
  id: string;
  user_id: string;
  address: string;
  label: string | null;
  chain: 'eth' | 'sol';
  min_value_usd: number;
  is_active: boolean;
  created_at: string;
  triggerCount: number;
  lastActivity: string;
}

export async function getWalletAlertsWithStats(
  supabase: SupabaseClient,
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

  return Promise.all(
    (alerts || []).map(async (alert) => {
      const { data: triggers } = await supabase
        .from('alert_triggers')
        .select('triggered_at')
        .eq('alert_id', alert.id)
        .gte('triggered_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('triggered_at', { ascending: false })
        .limit(10);

      return {
        id: String(alert.id),
        user_id: String(alert.user_id),
        address: String(alert.address),
        label: alert.label ? String(alert.label) : null,
        chain: String(alert.chain) as 'eth' | 'sol',
        min_value_usd: Number(alert.min_value_usd),
        is_active: Boolean(alert.is_active),
        created_at: String(alert.created_at),
        triggerCount: triggers?.length ?? 0,
        lastActivity: String(triggers?.[0]?.triggered_at ?? alert.created_at),
      };
    })
  );
}
