import type { SupabaseClient } from '@supabase/supabase-js';
import type { PriceAlertWithStats } from '@/types/alerts';

export async function getPriceAlertsWithStats(
  supabase: SupabaseClient,
  userId: string
): Promise<PriceAlertWithStats[]> {
  const { data: alerts, error } = await supabase
    .from('price_alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching price alerts:', error);
    return [];
  }

  return (alerts ?? []).map((alert) => ({
    id: String(alert.id),
    user_id: String(alert.user_id),
    symbol: String(alert.symbol),
    binance_symbol: String(alert.binance_symbol),
    logo: String(alert.logo ?? ''),
    target_price: Number(alert.target_price),
    direction: alert.direction as 'above' | 'below' | 'exact',
    is_active: Boolean(alert.is_active),
    recurring: alert.recurring !== false,
    triggered_at: alert.triggered_at ? String(alert.triggered_at) : null,
    last_triggered_at: alert.last_triggered_at ? String(alert.last_triggered_at) : null,
    created_at: String(alert.created_at),
  }));
}
