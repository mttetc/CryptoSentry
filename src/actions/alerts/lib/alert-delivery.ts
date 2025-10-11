'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendTelegramAlert } from '@/actions/messaging/providers/telegram/alert-notifications';
import {
  checkUserPreferences,
  formatAlertMessage,
} from '@/actions/messaging/utils/notification-utils';
import type { AlertNotification, NotificationResult, AlertDeliveryLog } from '../schemas';
import { alertDeliveryLogSchema } from '../schemas';

export async function logAlertDelivery(data: AlertDeliveryLog): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const validatedData = alertDeliveryLogSchema.parse(data);
  await supabase.from('alert_deliveries').insert(validatedData);
}

export async function deliverAlert(alert: AlertNotification): Promise<NotificationResult> {
  try {
    const prefs = await checkUserPreferences(alert.userId);
    if (!prefs) {
      return { success: false, error: 'User preferences not found' };
    }

    if (!prefs.canSend) {
      return { success: true, error: prefs.reason };
    }

    const message = await formatAlertMessage(alert.type, alert.data);

    // Deliver via Telegram
    const success = await sendTelegramAlert({
      userId: alert.userId,
      alertType: alert.type,
      message,
      data: alert.data,
    });

    if (!success) {
      throw new Error('Failed to send Telegram alert');
    }

    // Log delivery
    await logAlertDelivery({
      alert_id: alert.alertId,
      user_id: alert.userId,
      type: alert.type,
      channel: 'telegram',
      message_id: 'telegram_alert',
      data: alert.data,
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
