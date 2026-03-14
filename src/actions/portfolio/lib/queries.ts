import type { SupabaseClient } from '@supabase/supabase-js';

export interface PortfolioPosition {
  id: string;
  user_id: string;
  symbol: string;
  binance_symbol: string;
  amount: number;
  avg_buy_price: number;
  created_at: string;
}

export async function getPortfolioPositions(
  supabase: SupabaseClient,
  userId: string
): Promise<PortfolioPosition[]> {
  const { data } = await supabase
    .from('user_portfolios')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return (data as PortfolioPosition[]) ?? [];
}
