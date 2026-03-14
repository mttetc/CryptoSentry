'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/api/auth';
import { walletAlertSchema, updateWalletAlertSchema } from '../schemas';
import { checkWalletAlertLimit } from '@/lib/config/plans';
import type { z } from 'zod';
import type { ActionState } from '@/types/actions';

// --- Pure functions ---

function buildWalletAlertRow(userId: string, validated: z.infer<typeof walletAlertSchema>) {
  return {
    user_id: userId,
    address: validated.address,
    label: validated.label ?? null,
    chain: validated.chain,
    min_value_usd: validated.minValueUsd,
    is_active: true,
  };
}

function buildUpdateData(
  validated: z.infer<typeof updateWalletAlertSchema>
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (validated.isActive !== undefined) {
    data.is_active = validated.isActive;
  }
  if (validated.label !== undefined) {
    data.label = validated.label;
  }
  if (validated.minValueUsd !== undefined) {
    data.min_value_usd = validated.minValueUsd;
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

export async function createWalletAlert(
  input: z.input<typeof walletAlertSchema>
): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireAuth();
    const validated = walletAlertSchema.parse(input);

    // Check plan limits before creating
    const limitCheck = await checkWalletAlertLimit(userId);
    if (!limitCheck.allowed) {
      return { success: false, error: limitCheck.error };
    }

    const { error } = await supabase
      .from('wallet_alerts')
      .insert(buildWalletAlertRow(userId, validated))
      .select()
      .single();

    if (error) {
      throw error;
    }

    revalidatePath('/dashboard');

    return { success: true };
  } catch (error) {
    console.error('Failed to create wallet alert:', error);
    return toActionError(error, 'Failed to create wallet alert');
  }
}

export async function updateWalletAlert(
  input: z.infer<typeof updateWalletAlertSchema>
): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireAuth();
    const validated = updateWalletAlertSchema.parse(input);

    const { data: existingAlert } = await supabase
      .from('wallet_alerts')
      .select('user_id')
      .eq('id', validated.id)
      .single();

    if (!existingAlert || existingAlert.user_id !== userId) {
      return { success: false, error: 'Alert not found' };
    }

    const updateData = buildUpdateData(validated);
    if (Object.keys(updateData).length === 0) {
      return { success: true };
    }

    const { error } = await supabase
      .from('wallet_alerts')
      .update(updateData)
      .eq('id', validated.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Failed to update wallet alert:', error);
    return toActionError(error, 'Failed to update wallet alert');
  }
}

export async function deleteWalletAlert(alertId: string): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireAuth();

    const { data: existingAlert } = await supabase
      .from('wallet_alerts')
      .select('user_id')
      .eq('id', alertId)
      .single();

    if (!existingAlert || existingAlert.user_id !== userId) {
      return { success: false, error: 'Alert not found' };
    }

    const { error } = await supabase.from('wallet_alerts').delete().eq('id', alertId);

    if (error) {
      throw error;
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete wallet alert:', error);
    return toActionError(error, 'Failed to delete wallet alert');
  }
}
