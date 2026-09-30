'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, AuthError } from '@/lib/api/auth';
import { buildTelegramConnectLink } from '@/lib/telegram-connect-token';

export interface TelegramStatus {
  connected: boolean;
}

/** Polled by the QR component to detect when the webhook has linked the account. */
export async function checkTelegramStatus(): Promise<TelegramStatus> {
  try {
    const { supabase, userId } = await requireAuth();
    const { data } = await supabase
      .from('user_telegram_settings')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle();

    return { connected: data?.status === 'connected' };
  } catch (error) {
    if (error instanceof AuthError) {
      return { connected: false };
    }
    console.error('Failed to check Telegram status:', error);
    return { connected: false };
  }
}

/** Returns a fresh short-lived deep link (tokens expire after 10 minutes). */
export async function getTelegramConnectLink(): Promise<{ link: string } | { error: string }> {
  try {
    const { userId } = await requireAuth();
    return { link: buildTelegramConnectLink(userId) };
  } catch (error) {
    console.error('Failed to build Telegram connect link:', error);
    return { error: 'Failed to build connect link' };
  }
}

export async function disconnectTelegram(): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, userId } = await requireAuth();
    const { error } = await supabase
      .from('user_telegram_settings')
      .update({
        status: 'disconnected',
        telegram_chat_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    revalidatePath('/dashboard');
    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error('Failed to disconnect Telegram:', error);
    return { success: false, error: 'Failed to disconnect Telegram' };
  }
}
