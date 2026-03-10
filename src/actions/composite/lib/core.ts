'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/api/auth';
import { checkFeatureAccess } from '@/lib/config/plans';
import { compositeAlertSchema, updateCompositeAlertSchema } from '../schemas';
import type { z } from 'zod';
import type { ActionState } from '@/types/actions';

// --- Pure functions ---

function buildCompositeAlertRow(
  userId: string,
  validated: z.infer<typeof compositeAlertSchema>
) {
  return {
    user_id: userId,
    name: validated.name,
    conditions: validated.conditions,
    time_window_minutes: validated.timeWindowMinutes,
    is_active: true,
  };
}

function buildUpdateData(
  validated: z.infer<typeof updateCompositeAlertSchema>
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (validated.name !== undefined) {
    data.name = validated.name;
  }
  if (validated.isActive !== undefined) {
    data.is_active = validated.isActive;
  }
  if (validated.conditions !== undefined) {
    data.conditions = validated.conditions;
  }
  if (validated.timeWindowMinutes !== undefined) {
    data.time_window_minutes = validated.timeWindowMinutes;
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

export async function createCompositeAlert(
  input: z.input<typeof compositeAlertSchema>
): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireAuth();

    // Premium feature check
    const access = await checkFeatureAccess(userId, 'composite');
    if (!access.allowed) {
      return { success: false, error: access.error };
    }

    const validated = compositeAlertSchema.parse(input);

    const { error } = await supabase
      .from('composite_alerts')
      .insert(buildCompositeAlertRow(userId, validated))
      .select()
      .single();

    if (error) {
      throw error;
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Failed to create composite alert:', error);
    return toActionError(error, 'Failed to create composite alert');
  }
}

export async function updateCompositeAlert(
  input: z.infer<typeof updateCompositeAlertSchema>
): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireAuth();
    const validated = updateCompositeAlertSchema.parse(input);

    const { data: existing } = await supabase
      .from('composite_alerts')
      .select('user_id')
      .eq('id', validated.id)
      .single();

    if (!existing || existing.user_id !== userId) {
      return { success: false, error: 'Composite alert not found' };
    }

    const updateData = buildUpdateData(validated);
    if (Object.keys(updateData).length === 0) {
      return { success: true };
    }

    const { error } = await supabase
      .from('composite_alerts')
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
    console.error('Failed to update composite alert:', error);
    return toActionError(error, 'Failed to update composite alert');
  }
}

export async function deleteCompositeAlert(id: string): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireAuth();

    const { data: existing } = await supabase
      .from('composite_alerts')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existing || existing.user_id !== userId) {
      return { success: false, error: 'Composite alert not found' };
    }

    const { error } = await supabase
      .from('composite_alerts')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete composite alert:', error);
    return toActionError(error, 'Failed to delete composite alert');
  }
}
