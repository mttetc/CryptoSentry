'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/api/auth';
import { socialAlertSchema, updateSocialAlertSchema, type AlertState } from '../schemas';
import { socialMonitor } from '@/lib/services/twitter/social-monitor';
import type { z } from 'zod';

// --- Pure functions ---

function buildSocialAlertRow(userId: string, validated: z.infer<typeof socialAlertSchema>) {
  return {
    user_id: userId,
    platform: validated.platform,
    account: validated.account,
    keywords: validated.keywords,
    call_enabled: validated.callEnabled,
    is_active: true,
  };
}

function buildUpdateData(
  validated: z.infer<typeof updateSocialAlertSchema>
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (validated.isActive !== undefined) {
    data.is_active = validated.isActive;
  }
  if (validated.callEnabled !== undefined) {
    data.call_enabled = validated.callEnabled;
  }
  if (validated.keywords) {
    data.keywords = validated.keywords;
  }
  return data;
}

function toActionError(error: unknown, fallback: string): AlertState {
  return {
    success: false,
    error: error instanceof Error ? error.message : fallback,
  };
}

// --- Server actions ---

export async function createSocialAlert(
  input: z.input<typeof socialAlertSchema>
): Promise<AlertState> {
  try {
    const { supabase, userId } = await requireAuth();
    const validated = socialAlertSchema.parse(input);

    const { error } = await supabase
      .from('social_alerts')
      .insert(buildSocialAlertRow(userId, validated))
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Side effects: refresh monitor + revalidate cache (independent, parallel)
    await Promise.allSettled([
      socialMonitor.refreshAlerts(),
      Promise.resolve(revalidatePath('/dashboard')),
    ]);

    return { success: true };
  } catch (error) {
    console.error('Failed to create social alert:', error);
    return toActionError(error, 'Failed to create social alert');
  }
}

export async function updateSocialAlert(
  input: z.infer<typeof updateSocialAlertSchema>
): Promise<AlertState> {
  try {
    const { supabase, userId } = await requireAuth();
    const validated = updateSocialAlertSchema.parse(input);

    const { data: existingAlert } = await supabase
      .from('social_alerts')
      .select('user_id')
      .eq('id', validated.id)
      .single();

    if (!existingAlert || existingAlert.user_id !== userId) {
      return { success: false, error: 'Alert not found' };
    }

    const { error } = await supabase
      .from('social_alerts')
      .update(buildUpdateData(validated))
      .eq('id', validated.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Failed to update social alert:', error);
    return toActionError(error, 'Failed to update social alert');
  }
}

export async function deleteSocialAlert(alertId: string): Promise<AlertState> {
  try {
    const { supabase, userId } = await requireAuth();

    const { data: existingAlert } = await supabase
      .from('social_alerts')
      .select('user_id')
      .eq('id', alertId)
      .single();

    if (!existingAlert || existingAlert.user_id !== userId) {
      return { success: false, error: 'Alert not found' };
    }

    const { error } = await supabase.from('social_alerts').delete().eq('id', alertId);

    if (error) {
      throw error;
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete social alert:', error);
    return toActionError(error, 'Failed to delete social alert');
  }
}
