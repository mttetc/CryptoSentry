'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/api/auth';
import { priceAlertSchema, updatePriceAlertSchema } from '../schemas/price-alert-schemas';
import { checkAlertLimit } from '@/lib/config/plans';
import type { z } from 'zod';
import type { ActionState } from '@/types/actions';
import type { Database } from '@/types/database';

type PriceAlertUpdate = Database['public']['Tables']['price_alerts']['Update'];
import { priceAlertWorker } from '@/lib/services/price/price-alert-worker';

function refreshWorker(): void {
  priceAlertWorker.refreshAlerts().catch((error) => {
    console.error('Failed to refresh price worker:', error);
  });
}

// --- Pure functions ---

function buildPriceAlertRow(userId: string, validated: z.infer<typeof priceAlertSchema>) {
  return {
    user_id: userId,
    symbol: validated.symbol,
    binance_symbol: validated.binanceSymbol,
    logo: validated.logo,
    target_price: validated.targetPrice,
    direction: validated.direction,
    recurring: validated.recurring,
    is_active: true,
  };
}

function buildUpdateData(validated: z.infer<typeof updatePriceAlertSchema>): PriceAlertUpdate {
  const data: PriceAlertUpdate = {};

  if (validated.isActive !== undefined) {
    data.is_active = validated.isActive;
  }
  if (validated.targetPrice !== undefined) {
    data.target_price = validated.targetPrice;
  }
  if (validated.direction !== undefined) {
    data.direction = validated.direction;
    // Reset trigger state when direction changes — re-evaluate from scratch
    data.last_triggered_at = null;
    data.triggered_at = null;
    data.is_active = true;
  }
  if (validated.recurring !== undefined) {
    data.recurring = validated.recurring;
    // Reset cooldown when toggling recurring mode
    data.last_triggered_at = null;
  }
  return data;
}

function toActionError(error: unknown, fallback: string): ActionState {
  return {
    success: false,
    error: error instanceof Error ? error.message : fallback,
  };
}

// --- Server actions ---

export async function createPriceAlert(
  input: z.input<typeof priceAlertSchema>
): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireAuth();
    const validated = priceAlertSchema.parse(input);

    // Check plan limits before creating
    const alertLimit = await checkAlertLimit(userId);
    if (!alertLimit.allowed) {
      return { success: false, error: alertLimit.error };
    }

    const { error } = await supabase
      .from('price_alerts')
      .insert(buildPriceAlertRow(userId, validated))
      .select()
      .single();

    if (error) {
      throw error;
    }

    refreshWorker();
    revalidatePath('/dashboard');

    return { success: true };
  } catch (error) {
    console.error('Failed to create price alert:', error);
    return toActionError(error, 'Failed to create price alert');
  }
}

export async function updatePriceAlert(
  input: z.infer<typeof updatePriceAlertSchema>
): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireAuth();
    const validated = updatePriceAlertSchema.parse(input);

    const { data: existingAlert } = await supabase
      .from('price_alerts')
      .select('user_id, is_active')
      .eq('id', validated.id)
      .maybeSingle();

    if (!existingAlert || existingAlert.user_id !== userId) {
      return { success: false, error: 'Alert not found' };
    }

    const updateData = buildUpdateData(validated);
    if (Object.keys(updateData).length === 0) {
      return { success: true };
    }

    // Re-activating (explicitly, or implicitly via a direction change) counts like creating.
    if (updateData.is_active === true && !existingAlert.is_active) {
      const alertLimit = await checkAlertLimit(userId);
      if (!alertLimit.allowed) {
        return { success: false, error: alertLimit.error };
      }
    }

    const { error } = await supabase
      .from('price_alerts')
      .update(updateData)
      .eq('id', validated.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    refreshWorker();
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Failed to update price alert:', error);
    return toActionError(error, 'Failed to update price alert');
  }
}

export async function deletePriceAlert(alertId: string): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireAuth();

    const { data: existingAlert } = await supabase
      .from('price_alerts')
      .select('user_id')
      .eq('id', alertId)
      .maybeSingle();

    if (!existingAlert || existingAlert.user_id !== userId) {
      return { success: false, error: 'Alert not found' };
    }

    const { error } = await supabase.from('price_alerts').delete().eq('id', alertId);

    if (error) {
      throw error;
    }

    refreshWorker();
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete price alert:', error);
    return toActionError(error, 'Failed to delete price alert');
  }
}
