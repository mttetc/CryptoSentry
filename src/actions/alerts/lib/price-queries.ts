import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { PriceAlertWithStats } from '@/types/alerts';

export const getPriceAlertsWithStats = cache(async function getPriceAlertsWithStats(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<PriceAlertWithStats[]> {
  const { data: alerts, error } = await supabase
    .from('price_alerts')
    .select(
      'id, user_id, symbol, binance_symbol, logo, target_price, direction, is_active, recurring, triggered_at, last_triggered_at, created_at'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching price alerts:', error);
    return [];
  }

  return (alerts ?? []).map((alert) => ({
    id: alert.id,
    user_id: alert.user_id,
    symbol: alert.symbol,
    binance_symbol: alert.binance_symbol,
    logo: alert.logo ?? '',
    target_price: alert.target_price,
    direction: alert.direction,
    is_active: alert.is_active,
    recurring: alert.recurring,
    triggered_at: alert.triggered_at,
    last_triggered_at: alert.last_triggered_at,
    created_at: alert.created_at,
  }));
});
