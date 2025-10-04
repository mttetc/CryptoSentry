'use server';

import { sendTelegramVoiceCallSimple } from './voice-calls';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getTierFeatures } from '@/lib/config/pricing';
import type { PricingTier } from '@/lib/config/pricing';
import type { AlertNotification } from '@/types/notifications';

export async function sendTelegramAlert(notification: AlertNotification): Promise<boolean> {
  try {
    // Get user's pricing tier to check if they have Telegram voice calls
    const supabase = await createServerSupabaseClient();

    const { data: userData, error: userError } = await supabase
      .from('user_subscriptions')
      .select('pricing_tier')
      .eq('user_id', notification.userId)
      .single();

    if (userError || !userData) {
      console.error('Error getting user subscription:', userError);
      return false;
    }

    const userTier = userData.pricing_tier as PricingTier;
    const tierFeatures = getTierFeatures(userTier);

    // Check if user has Telegram voice calls enabled
    if (!tierFeatures.features.alerts.includes('telegram_voice')) {
      console.log(`User ${notification.userId} does not have Telegram voice calls enabled`);
      return false;
    }

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
      await supabase.from('alert_delivery_logs').insert({
        alert_id: notification.userId, // This should be the actual alert ID
        user_id: notification.userId,
        type: notification.alertType,
        channel: 'telegram_voice',
        message_id: result.messageId || '',
        data: notification.data,
      });

      console.log(`Telegram voice alert sent to user ${notification.userId}`);
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
