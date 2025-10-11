'use server';

import { sendTelegramVoiceCallSimple } from './voice-calls';
import { createServerSupabaseClient } from '@/lib/supabase/server';
// Telegram alert notifications
import type { AlertNotification } from '@/types/notifications';

export async function sendTelegramAlert(notification: AlertNotification): Promise<boolean> {
  try {
    // All users have access to Telegram alerts (simplified)

    // Format the message based on alert type
    let formattedMessage: string;

    if (notification.alertType === 'price') {
      formattedMessage = `Price Alert: ${notification.data.symbol} is now $${notification.data.price}`;
    } else {
      formattedMessage = `Social Alert: ${notification.data.account} mentioned your keywords: ${notification.data.keywords?.join(', ')}`;
      if (notification.data.tweet_url) {
        formattedMessage += `\nTweet: ${notification.data.tweet_url}`;
      }
    }

    // Send the voice call
    const result = await sendTelegramVoiceCallSimple({
      userId: notification.userId,
      message: formattedMessage,
      priority: 'high',
    });

    if (result.success) {
      // Log the successful notification
      const supabase = await createServerSupabaseClient();
      await supabase.from('alert_delivery_logs').insert({
        alert_id: notification.userId, // This should be the actual alert ID
        user_id: notification.userId,
        type: notification.alertType,
        channel: 'telegram_voice',
        message_id: result.messageId || '',
        data: notification.data,
      });

      console.warn(`Telegram voice alert sent to user ${notification.userId}`);
      return true;
    } else {
      console.error(
        `Failed to send Telegram voice alert to user ${notification.userId}:`,
        result.error
      );
      return false;
    }
  } catch (error) {
    console.error('Error sending Telegram alert:', error);
    return false;
  }
}
