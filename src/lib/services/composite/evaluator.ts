import { createServiceSupabaseClient } from '@/lib/supabase/server';
import { sendUnifiedAlert } from '@/actions/messaging/unified-notifications';
import type { CompositeAlertRow, CompositeCondition } from './types';

// --- Pure functions ---

interface TriggerEvent {
  type: string;
  data: Record<string, unknown>;
}

function matchesCondition(
  condition: CompositeCondition,
  event: TriggerEvent
): boolean {
  if (condition.type !== event.type) {
    return false;
  }

  switch (condition.type) {
    case 'social':
      return (
        event.data.account === condition.account &&
        condition.keywords.some((kw) =>
          String(event.data.content ?? '')
            .toLowerCase()
            .includes(kw.toLowerCase())
        )
      );
    case 'price':
      return event.data.symbol === condition.symbol;
    case 'whale':
      return event.data.chain === condition.chain;
    default:
      return false;
  }
}

function buildConditionEventRow(
  alertId: string,
  conditionIndex: number,
  data: Record<string, unknown>
) {
  return {
    composite_alert_id: alertId,
    condition_index: conditionIndex,
    trigger_data: data,
    occurred_at: new Date().toISOString(),
  };
}

function allConditionsSatisfied(
  conditionCount: number,
  satisfiedIndices: Set<number>
): boolean {
  for (let i = 0; i < conditionCount; i++) {
    if (!satisfiedIndices.has(i)) {
      return false;
    }
  }
  return true;
}

// --- I/O helpers ---

async function fetchActiveCompositeAlerts(
  userId: string
): Promise<CompositeAlertRow[]> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('composite_alerts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    console.error('[Composite] Error fetching alerts:', error);
    return [];
  }

  return (data as CompositeAlertRow[]) ?? [];
}

async function insertConditionEvent(
  alertId: string,
  conditionIndex: number,
  data: Record<string, unknown>
): Promise<void> {
  const supabase = createServiceSupabaseClient();
  await supabase
    .from('composite_condition_events')
    .insert(buildConditionEventRow(alertId, conditionIndex, data));
}

async function getRecentConditionIndices(
  alertId: string,
  timeWindowMinutes: number
): Promise<Set<number>> {
  const supabase = createServiceSupabaseClient();
  const cutoff = new Date(
    Date.now() - timeWindowMinutes * 60 * 1000
  ).toISOString();

  const { data } = await supabase
    .from('composite_condition_events')
    .select('condition_index')
    .eq('composite_alert_id', alertId)
    .gte('occurred_at', cutoff);

  const indices = new Set<number>();
  for (const row of data ?? []) {
    indices.add(Number(row.condition_index));
  }
  return indices;
}

async function clearConditionEvents(alertId: string): Promise<void> {
  const supabase = createServiceSupabaseClient();
  await supabase
    .from('composite_condition_events')
    .delete()
    .eq('composite_alert_id', alertId);
}

async function updateLastEvaluated(alertId: string): Promise<void> {
  const supabase = createServiceSupabaseClient();
  await supabase
    .from('composite_alerts')
    .update({ last_evaluated_at: new Date().toISOString() })
    .eq('id', alertId);
}

// --- Main evaluator ---

interface CompositeEvent {
  type: string;
  userId: string;
  data: Record<string, unknown>;
}

/**
 * Check if a trigger event satisfies any composite alert conditions.
 * When all conditions for a composite alert are met within the time window,
 * fire a unified notification and clear the condition events.
 */
export async function checkCompositeConditions(
  event: CompositeEvent
): Promise<void> {
  const alerts = await fetchActiveCompositeAlerts(event.userId);

  for (const alert of alerts) {
    const conditions = alert.conditions as CompositeCondition[];

    // Find which conditions this event matches
    const matchedIndices: number[] = [];
    for (let i = 0; i < conditions.length; i++) {
      if (matchesCondition(conditions[i], { type: event.type, data: event.data })) {
        matchedIndices.push(i);
      }
    }

    if (matchedIndices.length === 0) {
      continue;
    }

    // Record matched condition events
    await Promise.all(
      matchedIndices.map((idx) =>
        insertConditionEvent(alert.id, idx, event.data)
      )
    );

    // Check if all conditions are now satisfied within the time window
    const satisfiedIndices = await getRecentConditionIndices(
      alert.id,
      alert.time_window_minutes
    );

    if (allConditionsSatisfied(conditions.length, satisfiedIndices)) {
      // All conditions met - fire the composite alert
      await sendUnifiedAlert({
        userId: event.userId,
        alertType: 'composite',
        alertId: alert.id,
        message: `Composite alert "${alert.name}" triggered: all ${conditions.length} conditions met.`,
        data: {
          summary: `All conditions for "${alert.name}" were satisfied within ${alert.time_window_minutes} minutes.`,
        },
      });

      // Clear events and update timestamp
      await Promise.all([
        clearConditionEvents(alert.id),
        updateLastEvaluated(alert.id),
      ]);
    }
  }
}
