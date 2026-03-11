'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/api/auth';
import type { ActionState } from '@/types/actions';
import type { z } from 'zod';
import {
  addChannelSchema,
  updateChannelSchema,
  emailChannelConfigSchema,
  discordChannelConfigSchema,
  smsChannelConfigSchema,
} from '../schemas';

// --- Pure functions ---

function validateChannelConfig(
  channelType: string,
  config: Record<string, unknown>
): { success: true; data: Record<string, unknown> } | { success: false; error: string } {
  switch (channelType) {
    case 'email': {
      const result = emailChannelConfigSchema.safeParse(config);
      if (!result.success) {
        return { success: false, error: `Invalid email config: ${result.error.message}` };
      }
      return { success: true, data: result.data };
    }
    case 'discord': {
      const result = discordChannelConfigSchema.safeParse(config);
      if (!result.success) {
        return { success: false, error: `Invalid Discord config: ${result.error.message}` };
      }
      return { success: true, data: result.data };
    }
    case 'sms': {
      const result = smsChannelConfigSchema.safeParse(config);
      if (!result.success) {
        return { success: false, error: `Invalid SMS config: ${result.error.message}` };
      }
      return { success: true, data: result.data };
    }
    default: {
      return { success: false, error: `Unsupported channel type: ${channelType}` };
    }
  }
}

function buildChannelRow(
  userId: string,
  validated: z.infer<typeof addChannelSchema>,
  validatedConfig: Record<string, unknown>
) {
  return {
    user_id: userId,
    channel_type: validated.channelType,
    config: validatedConfig,
    alert_types: validated.alertTypes ?? ['social', 'price', 'whale', 'composite'],
    is_active: true,
  };
}

function buildUpdateData(validated: z.infer<typeof updateChannelSchema>): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (validated.isActive !== undefined) {
    data.is_active = validated.isActive;
  }
  if (validated.config !== undefined) {
    data.config = validated.config;
  }
  if (validated.alertTypes !== undefined) {
    data.alert_types = validated.alertTypes;
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

export async function addNotificationChannel(
  input: z.input<typeof addChannelSchema>
): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireAuth();
    const validated = addChannelSchema.parse(input);

    // Validate the channel-specific config
    const configResult = validateChannelConfig(validated.channelType, validated.config);
    if (!configResult.success) {
      return { success: false, error: configResult.error };
    }

    const { error } = await supabase
      .from('notification_channels')
      .insert(buildChannelRow(userId, validated, configResult.data))
      .select()
      .single();

    if (error) {
      throw error;
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Failed to add notification channel:', error);
    return toActionError(error, 'Failed to add notification channel');
  }
}

export async function updateNotificationChannel(
  input: z.input<typeof updateChannelSchema>
): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireAuth();
    const validated = updateChannelSchema.parse(input);

    // Verify ownership
    const { data: existing } = await supabase
      .from('notification_channels')
      .select('user_id')
      .eq('id', validated.id)
      .single();

    if (!existing || existing.user_id !== userId) {
      return { success: false, error: 'Channel not found' };
    }

    // Validate config if provided
    if (validated.config) {
      const { data: channel } = await supabase
        .from('notification_channels')
        .select('channel_type')
        .eq('id', validated.id)
        .single();

      if (channel) {
        const configResult = validateChannelConfig(
          channel.channel_type as string,
          validated.config
        );
        if (!configResult.success) {
          return { success: false, error: configResult.error };
        }
      }
    }

    const { error } = await supabase
      .from('notification_channels')
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
    console.error('Failed to update notification channel:', error);
    return toActionError(error, 'Failed to update notification channel');
  }
}

export async function removeNotificationChannel(id: string): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireAuth();

    // Verify ownership
    const { data: existing } = await supabase
      .from('notification_channels')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existing || existing.user_id !== userId) {
      return { success: false, error: 'Channel not found' };
    }

    const { error } = await supabase.from('notification_channels').delete().eq('id', id);

    if (error) {
      throw error;
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Failed to remove notification channel:', error);
    return toActionError(error, 'Failed to remove notification channel');
  }
}

export async function getNotificationChannels(): Promise<
  { success: true; data: Record<string, unknown>[] } | { success: false; error: string }
> {
  try {
    const { supabase, userId } = await requireAuth();

    const { data, error } = await supabase
      .from('notification_channels')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return { success: true, data: (data as Record<string, unknown>[]) ?? [] };
  } catch (error) {
    console.error('Failed to get notification channels:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get notification channels',
    };
  }
}
