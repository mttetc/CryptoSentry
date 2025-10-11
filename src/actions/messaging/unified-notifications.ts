'use server';

import { sendTelegramAlert } from '@/actions/messaging/providers/telegram/alert-notifications';
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
    content?: string;
  };
}

interface NotificationResult {
  telegram: {
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
    overallSuccess: false,
  };

  try {
    // Get user's Telegram settings
    const supabase = await createServerSupabaseClient();

    const { data: telegramSettings } = await supabase
      .from('user_telegram_settings')
      .select('status')
      .eq('user_id', notification.userId)
      .eq('status', 'connected')
      .single();

    const hasTelegram = telegramSettings?.status === 'connected';

    if (hasTelegram) {
      try {
        const success = await sendTelegramAlert(notification);
        results.telegram.success = success;
        if (!success) {
          results.telegram.error = 'Failed to send Telegram alert';
        }
      } catch (error) {
        results.telegram.success = false;
        results.telegram.error = error instanceof Error ? error.message : 'Unknown error';
      }
    } else {
      results.telegram.error = 'Telegram not connected';
    }

    // Overall success if Telegram succeeded
    results.overallSuccess = results.telegram.success;

    // Log the notification attempt
    await supabase.from('alert_delivery_logs').insert({
      alert_id: notification.userId,
      user_id: notification.userId,
      type: notification.alertType,
      channel: 'telegram',
      message_id: '',
      data: {
        ...notification.data,
        telegram_success: results.telegram.success,
        telegram_error: results.telegram.error,
      },
    });

    return results;
  } catch (error) {
    console.error('Error sending unified alert:', error);
    return {
      telegram: { success: false, error: 'System error' },
      overallSuccess: false,
    };
  }
}
