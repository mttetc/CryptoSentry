'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/api/auth';
import { checkFeatureAccess } from '@/lib/config/plans';
import { conditionalRuleSchema, updateConditionalRuleSchema } from '../schemas';
import type { z } from 'zod';
import type { ActionState } from '@/types/actions';

// --- Pure functions ---

function buildRuleRow(
  userId: string,
  validated: z.infer<typeof conditionalRuleSchema>
) {
  return {
    user_id: userId,
    name: validated.name,
    rule_type: validated.ruleType,
    config: validated.config,
    time_window_minutes: validated.timeWindowMinutes,
    is_active: true,
  };
}

function buildUpdateData(
  validated: z.infer<typeof updateConditionalRuleSchema>
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (validated.name !== undefined) {
    data.name = validated.name;
  }
  if (validated.isActive !== undefined) {
    data.is_active = validated.isActive;
  }
  if (validated.config !== undefined) {
    data.config = validated.config;
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

export async function createConditionalRule(
  input: z.input<typeof conditionalRuleSchema>
): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireAuth();

    // Premium feature check (uses 'composite' feature gate)
    const access = await checkFeatureAccess(userId, 'composite');
    if (!access.allowed) {
      return { success: false, error: access.error };
    }

    const validated = conditionalRuleSchema.parse(input);

    const { error } = await supabase
      .from('conditional_rules')
      .insert(buildRuleRow(userId, validated))
      .select()
      .single();

    if (error) {
      throw error;
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Failed to create conditional rule:', error);
    return toActionError(error, 'Failed to create conditional rule');
  }
}

export async function updateConditionalRule(
  input: z.infer<typeof updateConditionalRuleSchema>
): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireAuth();
    const validated = updateConditionalRuleSchema.parse(input);

    const { data: existing } = await supabase
      .from('conditional_rules')
      .select('user_id')
      .eq('id', validated.id)
      .single();

    if (!existing || existing.user_id !== userId) {
      return { success: false, error: 'Rule not found' };
    }

    const updateData = buildUpdateData(validated);
    if (Object.keys(updateData).length === 0) {
      return { success: true };
    }

    const { error } = await supabase
      .from('conditional_rules')
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
    console.error('Failed to update conditional rule:', error);
    return toActionError(error, 'Failed to update conditional rule');
  }
}

export async function deleteConditionalRule(id: string): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireAuth();

    const { data: existing } = await supabase
      .from('conditional_rules')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existing || existing.user_id !== userId) {
      return { success: false, error: 'Rule not found' };
    }

    const { error } = await supabase
      .from('conditional_rules')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete conditional rule:', error);
    return toActionError(error, 'Failed to delete conditional rule');
  }
}
