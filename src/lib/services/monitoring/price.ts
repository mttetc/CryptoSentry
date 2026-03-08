import type { MonitorState } from '@/actions/monitor/schemas/monitor';
import { requireAuth } from '@/lib/api/auth';

// --- Pure functions ---

function isPriceTriggered(condition: string, currentPrice: number, targetPrice: number): boolean {
  return (
    (condition === 'above' && currentPrice >= targetPrice) ||
    (condition === 'below' && currentPrice <= targetPrice)
  );
}

interface PriceAlert {
  id: string;
  symbol: string;
  condition: string;
  targetPrice: number;
  is_recurring: boolean;
}

function findTriggeredAlerts(
  alerts: PriceAlert[],
  symbol: string,
  price: number
): PriceAlert[] {
  return alerts
    .filter((alert) => alert.symbol === symbol)
    .filter((alert) => isPriceTriggered(alert.condition, price, alert.targetPrice));
}

// --- I/O orchestrator ---

export async function monitorPrice(symbol: string, price: number): Promise<MonitorState> {
  try {
    const { supabase, userId } = await requireAuth();

    const { data: priceAlertsData } = await supabase
      .from('price_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true);

    const triggered = findTriggeredAlerts(priceAlertsData || [], symbol, price);

    if (triggered.length === 0) {
      return { success: true };
    }

    // Run all DB operations in parallel
    const inserts = triggered.map((alert) =>
      supabase.from('alert_triggers').insert({
        alert_id: alert.id,
        triggered_at: new Date().toISOString(),
        price,
      })
    );

    const deactivations = triggered
      .filter((alert) => !alert.is_recurring)
      .map((alert) =>
        supabase.from('price_alerts').update({ active: false }).eq('id', alert.id)
      );

    await Promise.allSettled([...inserts, ...deactivations]);

    return { success: true };
  } catch (error) {
    console.error('Failed to monitor price:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to monitor price',
    };
  }
}
