import type { SupabaseClient } from '@supabase/supabase-js';
import type { CompositeAlertRow, ConditionEvent } from '@/lib/services/composite/types';

export interface CompositeAlertWithStatus extends CompositeAlertRow {
  recentEvents: ConditionEvent[];
  satisfiedCount: number;
}

/**
 * Fetch composite alerts with recent condition events for status display.
 */
export async function getCompositeAlertsWithStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<CompositeAlertWithStatus[]> {
  const { data: alerts, error } = await supabase
    .from('composite_alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching composite alerts:', error);
    return [];
  }

  return Promise.all(
    ((alerts as CompositeAlertRow[]) ?? []).map(async (alert) => {
      const cutoff = new Date(
        Date.now() - alert.time_window_minutes * 60 * 1000
      ).toISOString();

      const { data: events } = await supabase
        .from('composite_condition_events')
        .select('*')
        .eq('composite_alert_id', alert.id)
        .gte('occurred_at', cutoff)
        .order('occurred_at', { ascending: false });

      const recentEvents = (events as ConditionEvent[]) ?? [];

      // Count distinct satisfied condition indices
      const satisfiedIndices = new Set(
        recentEvents.map((e) => e.condition_index)
      );

      return {
        ...alert,
        recentEvents,
        satisfiedCount: satisfiedIndices.size,
      };
    })
  );
}
