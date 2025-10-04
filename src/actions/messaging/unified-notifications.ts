'use server';

import { sendTelegramAlert } from '@/actions/messaging/providers/telegram/alert-notifications';
import { sendWhatsAppAlert } from '@/actions/messaging/providers/whatsapp/alert-notifications';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface UnifiedAlertNotification {
  userId: string;
  alertType: 'price' | 'social';
  message: string;
  data: {
    symbol?: string;
    price?: number;
    account?: string;
    keywords?: string[];
    tweet_url?: string;
  };
}

interface NotificationResult {
  telegram: {
    success: boolean;
    error?: string;
  };
  whatsapp: {
    success: boolean;
    error?: string;
  };
  overallSuccess: boolean;
}

export async function sendUnifiedAlert(
  notification: UnifiedAlertNotification
): Promise<NotificationResult> {
  const results: NotificationResult = {
    telegram: { success: false },
    whatsapp: { success: false },
    overallSuccess: false,
  };

  try {
    // Get user's connected services
    const supabase = await createServerSupabaseClient();

    const [telegramSettings, whatsappSettings] = await Promise.all([
      supabase
        .from('user_telegram_settings')
        .select('status')
        .eq('user_id', notification.userId)
        .eq('status', 'connected')
        .single(),
      supabase
        .from('user_whatsapp_settings')
        .select('status')
        .eq('user_id', notification.userId)
        .eq('status', 'connected')
        .single(),
    ]);

    const hasTelegram = telegramSettings.data?.status === 'connected';
    const hasWhatsApp = whatsappSettings.data?.status === 'connected';

    // Send to both services in parallel
    const promises: Promise<any>[] = [];

    if (hasTelegram) {
      promises.push(
        sendTelegramAlert(notification)
          .then((success) => {
            results.telegram.success = success;
            if (!success) {
              results.telegram.error = 'Failed to send Telegram alert';
            }
          })
          .catch((error) => {
            results.telegram.success = false;
            results.telegram.error = error.message;
          })
      );
    }

    if (hasWhatsApp) {
      promises.push(
        sendWhatsAppAlert(notification)
          .then((success) => {
            results.whatsapp.success = success;
            if (!success) {
              results.whatsapp.error = 'Failed to send WhatsApp alert';
            }
          })
          .catch((error) => {
            results.whatsapp.success = false;
            results.whatsapp.error = error.message;
          })
      );
    }

    // Wait for all notifications to complete
    await Promise.all(promises);

    // Overall success if at least one service succeeded
    results.overallSuccess = results.telegram.success || results.whatsapp.success;

    // Log the notification attempt
    await supabase.from('alert_delivery_logs').insert({
      alert_id: notification.userId,
      user_id: notification.userId,
      type: notification.alertType,
      channel: 'unified',
      message_id: '',
      data: {
        ...notification.data,
        telegram_success: results.telegram.success,
        whatsapp_success: results.whatsapp.success,
        telegram_error: results.telegram.error,
        whatsapp_error: results.whatsapp.error,
      },
    });

    return results;
  } catch (error) {
    console.error('Error sending unified alert:', error);
    return {
      telegram: { success: false, error: 'System error' },
      whatsapp: { success: false, error: 'System error' },
      overallSuccess: false,
    };
  }
}
