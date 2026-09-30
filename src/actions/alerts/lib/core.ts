'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/api/auth';
import { socialAlertSchema, updateSocialAlertSchema, type AlertState } from '../schemas';
import { socialMonitor } from '@/lib/services/twitter/social-monitor';
import { checkSocialAlertLimits, getPlanLimits, getUserPlan } from '@/lib/config/plans';
import type { z } from 'zod';

// --- Pure functions ---

function buildSocialAlertRow(userId: string, validated: z.infer<typeof socialAlertSchema>) {
  return {
    user_id: userId,
    platform: validated.platform,
    account: validated.account,
    keywords: validated.keywords,
    call_enabled: validated.callEnabled,
    sentiment_filter: validated.sentimentFilter ?? null,
    include_replies: validated.includeReplies,
    is_active: true,
  };
}

function buildUpdateData(validated: z.infer<typeof updateSocialAlertSchema>) {
  const data: {
    is_active?: boolean;
    call_enabled?: boolean;
    keywords?: string[];
    sentiment_filter?: string | null;
    include_replies?: boolean;
  } = {};

  if (validated.isActive !== undefined) {
    data.is_active = validated.isActive;
  }
  if (validated.callEnabled !== undefined) {
    data.call_enabled = validated.callEnabled;
  }
  if (validated.keywords) {
    data.keywords = validated.keywords;
  }
  if (validated.sentimentFilter !== undefined) {
    data.sentiment_filter = validated.sentimentFilter;
  }
  if (validated.includeReplies !== undefined) {
    data.include_replies = validated.includeReplies;
  }
  return data;
}

function toActionError(error: unknown, fallback: string): AlertState {
  return {
    success: false,
    error: error instanceof Error ? error.message : fallback,
  };
}

function refreshMonitor(): void {
  socialMonitor.refreshAlerts().catch((error) => {
    console.error('Failed to refresh social monitor:', error);
  });
}

// --- Server actions ---

export async function validateXAccount(account: string): Promise<{ exists: boolean }> {
  await requireAuth();

  try {
    const res = await fetch(
      `https://publish.twitter.com/oembed?url=https://x.com/${encodeURIComponent(account.replace(/^@/, ''))}`
    );
    return { exists: res.ok };
  } catch {
    return { exists: false };
  }
}

export async function createSocialAlert(
  input: z.input<typeof socialAlertSchema>
): Promise<AlertState> {
  try {
    const { supabase, userId } = await requireAuth();
    const validated = socialAlertSchema.parse(input);

    // Every plan limit here maps to a cost driver on the X stream.
    const limits = await checkSocialAlertLimits(userId, {
      account: validated.account,
      keywords: validated.keywords,
      includeReplies: validated.includeReplies,
    });
    if (!limits.allowed) {
      return { success: false, error: limits.error };
    }

    const { error } = await supabase
      .from('social_alerts')
      .insert(buildSocialAlertRow(userId, validated));

    if (error) {
      throw error;
    }

    refreshMonitor();
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Failed to create social alert:', error);
    return toActionError(error, 'Failed to create social alert');
  }
}

export async function updateSocialAlert(
  input: z.input<typeof updateSocialAlertSchema>
): Promise<AlertState> {
  try {
    const { supabase, userId } = await requireAuth();
    const validated = updateSocialAlertSchema.parse(input);

    const { data: existingAlert } = await supabase
      .from('social_alerts')
      .select('user_id, account, keywords, include_replies, is_active')
      .eq('id', validated.id)
      .maybeSingle();

    if (!existingAlert || existingAlert.user_id !== userId) {
      return { success: false, error: 'Alert not found' };
    }

    // Re-activating counts like creating: limits only consider active alerts.
    if (validated.isActive === true && !existingAlert.is_active) {
      const limits = await checkSocialAlertLimits(userId, {
        account: existingAlert.account,
        keywords: validated.keywords ?? existingAlert.keywords,
        includeReplies: validated.includeReplies ?? existingAlert.include_replies,
      });
      if (!limits.allowed) {
        return { success: false, error: limits.error };
      }
    }

    if (validated.keywords || validated.includeReplies) {
      const plan = getPlanLimits(await getUserPlan(userId));
      if (validated.keywords && validated.keywords.length > plan.maxKeywordsPerAlert) {
        return {
          success: false,
          error: `The ${plan.label} plan allows ${plan.maxKeywordsPerAlert} keywords per alert.`,
        };
      }
      if (validated.includeReplies && !plan.allowReplies) {
        return { success: false, error: 'Including replies and quotes requires the Premium plan.' };
      }
    }

    const updateData = buildUpdateData(validated);
    if (Object.keys(updateData).length === 0) {
      return { success: true };
    }

    const { error } = await supabase
      .from('social_alerts')
      .update(updateData)
      .eq('id', validated.id);

    if (error) {
      throw error;
    }

    refreshMonitor();
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
      .maybeSingle();

    if (!existingAlert || existingAlert.user_id !== userId) {
      return { success: false, error: 'Alert not found' };
    }

    const { error } = await supabase.from('social_alerts').delete().eq('id', alertId);

    if (error) {
      throw error;
    }

    refreshMonitor();
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete social alert:', error);
    return toActionError(error, 'Failed to delete social alert');
  }
}
