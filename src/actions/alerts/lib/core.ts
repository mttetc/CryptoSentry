'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/api/auth';
import {
  priceAlertSchema,
  socialAlertSchema,
  updateSocialAlertSchema,
  type AlertState,
} from '../schemas';
import { socialMonitor } from '@/lib/services/apify/social-monitor';
import type { z } from 'zod';

// --- Pure functions ---

function buildPriceAlertRow(userId: string, validated: z.infer<typeof priceAlertSchema>) {
  return {
    user_id: userId,
    symbol: validated.symbol,
    target_price: validated.targetPrice,
    condition: validated.condition,
    active: true,
  };
}

function buildSocialAlertRow(userId: string, validated: z.infer<typeof socialAlertSchema>) {
  return {
    user_id: userId,
    platform: validated.platform,
    account: validated.account,
    keywords: validated.keywords,
    telegram_conversation_id: validated.telegramConversationId || null,
    is_active: true,
  };
}

function buildUpdateData(validated: z.infer<typeof updateSocialAlertSchema>): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (validated.isActive !== undefined) {
    data.is_active = validated.isActive;
  }
  if (validated.keywords) {
    data.keywords = validated.keywords;
  }
  if (validated.telegramConversationId) {
    data.telegram_conversation_id = validated.telegramConversationId;
  }

  return data;
}

function toActionError(error: unknown, fallback: string): AlertState {
  return {
    success: false,
    error: error instanceof Error ? error.message : fallback,
  };
}

// --- Wrapper for external consumers ---

export async function getAuthenticatedClient() {
  return requireAuth();
}

// --- Server actions ---

export async function createPriceAlert(
  input: z.infer<typeof priceAlertSchema>
): Promise<AlertState> {
  try {
    const { supabase, userId } = await requireAuth();
    const validated = priceAlertSchema.parse(input);

    const { error } = await supabase
      .from('price_alerts')
      .insert(buildPriceAlertRow(userId, validated))
      .select()
      .single();

    if (error) {
      throw error;
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Failed to create price alert:', error);
    return toActionError(error, 'Failed to create price alert');
  }
}

export async function createSocialAlert(
  input: z.infer<typeof socialAlertSchema>
): Promise<AlertState> {
  try {
    const { supabase, userId } = await requireAuth();
    const validated = socialAlertSchema.parse(input);

    const { data: existingAlert } = await supabase
      .from('social_alerts')
      .select('id')
      .eq('user_id', userId)
      .eq('account', validated.account)
      .single();

    if (existingAlert) {
      return { success: false, error: 'You already have an alert for this account' };
    }

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

