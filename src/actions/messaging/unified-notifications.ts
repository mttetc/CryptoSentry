'use server';

import { sendTelegramAlert } from '@/actions/messaging/providers/telegram/alert-notifications';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { AlertNotification, NotificationResult } from '@/types/notifications';

// --- Pure function ---

function buildResult(
  telegramSuccess: boolean,
  telegramError?: string
): NotificationResult {
  return {
    telegram: { success: telegramSuccess, error: telegramError },
    overallSuccess: telegramSuccess,
  };
}

function buildDeliveryLogEntry(
  notification: AlertNotification,
  result: NotificationResult
): Record<string, unknown> {
  return {
    alert_id: notification.alertId || notification.userId,
    user_id: notification.userId,
    type: notification.alertType,
    channel: 'telegram',
    message_id: '',
    data: {
      ...notification.data,
      telegram_success: result.telegram.success,
      telegram_error: result.telegram.error,
    },
  };
}

// --- Single-responsibility I/O ---

async function checkTelegramConnected(userId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('user_telegram_settings')
    .select('status')
    .eq('user_id', userId)
    .eq('status', 'connected')
    .single();

  return data?.status === 'connected';
}

async function persistDeliveryLog(entry: Record<string, unknown>): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.from('alert_delivery_logs').insert(entry);
}

// --- I/O orchestrator ---

export async function sendUnifiedAlert(
  notification: AlertNotification
): Promise<NotificationResult> {
  try {
    const hasTelegram = await checkTelegramConnected(notification.userId);

    if (!hasTelegram) {
      const result = buildResult(false, 'Telegram not connected');
      persistDeliveryLog(buildDeliveryLogEntry(notification, result)).catch((error) => {
        console.error('Failed to log delivery:', error);
      });
      return result;
    }

    const success = await sendTelegramAlert(notification);
    const result = buildResult(
      success,
      success ? undefined : 'Failed to send Telegram alert'
    );

    // Fire-and-forget: don't block on logging
    persistDeliveryLog(buildDeliveryLogEntry(notification, result)).catch((error) => {
      console.error('Failed to log delivery:', error);
    });

    return result;
  } catch (error) {
    console.error('Error sending unified alert:', error);
    return buildResult(false, 'System error');
  }
}
