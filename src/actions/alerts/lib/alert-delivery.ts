'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendTelegramAlert } from '@/actions/messaging/providers/telegram/alert-notifications';
import {
  checkUserPreferences,
  formatAlertMessage,
} from '@/actions/messaging/utils/notification-utils';
import type { AlertNotification } from '@/types/notifications';
import { type AlertDeliveryLog, alertDeliveryLogSchema } from '../schemas';

// --- Single-responsibility I/O functions ---

async function persistDeliveryLog(data: AlertDeliveryLog): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const validatedData = alertDeliveryLogSchema.parse(data);
  await supabase.from('alert_deliveries').insert(validatedData);
}

// --- Pure function ---

function buildDeliveryLog(alert: AlertNotification): AlertDeliveryLog {
  return {
    alert_id: alert.alertId || alert.userId,
    user_id: alert.userId,
    type: alert.alertType,
    channel: 'telegram',
    message_id: 'telegram_alert',
    data: alert.data,
  };
}

// --- I/O orchestrator ---

export async function deliverAlert(alert: AlertNotification): Promise<{ success: boolean; error?: string }> {
  try {
    const prefs = await checkUserPreferences(alert.userId);
    if (!prefs) {
      return { success: false, error: 'User preferences not found' };
    }

    if (!prefs.canSend) {
      return { success: true, error: prefs.reason };
    }

    const message = formatAlertMessage(alert.alertType, alert.data);

    const success = await sendTelegramAlert({
      userId: alert.userId,
      alertType: alert.alertType,
      message,
      data: alert.data,
    });

    if (!success) {
      return { success: false, error: 'Failed to send Telegram alert' };
    }

    // Fire-and-forget: don't block on logging
    persistDeliveryLog(buildDeliveryLog(alert)).catch((error) => {
      console.error('Failed to log alert delivery:', error);
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to deliver alert:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deliver alert',
    };
  }
}
