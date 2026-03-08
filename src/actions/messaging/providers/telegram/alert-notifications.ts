'use server';

import { sendTelegramVoiceCallSimple } from './voice-calls';
import type { AlertNotification } from '@/types/notifications';

// --- Pure function ---

function formatNotificationMessage(notification: AlertNotification): string {
  if (notification.alertType === 'price') {
    return `Price Alert: ${notification.data.symbol} is now $${notification.data.price}`;
  }

  const keywords = Array.isArray(notification.data.keywords)
    ? notification.data.keywords.join(', ')
    : '';
  const base = `Social Alert: ${notification.data.account} mentioned your keywords: ${keywords}`;

  if (notification.data.tweet_url) {
    return `${base}\nTweet: ${notification.data.tweet_url}`;
  }

  return base;
}

// --- I/O orchestrator ---

export async function sendTelegramAlert(notification: AlertNotification): Promise<boolean> {
  try {
    const formattedMessage = formatNotificationMessage(notification);

    const result = await sendTelegramVoiceCallSimple({
      userId: notification.userId,
      message: formattedMessage,
      priority: 'high',
    });

    if (!result.success) {
      console.error(
        `Failed to send Telegram voice alert to user ${notification.userId}:`,
        result.error
      );
    }

    return result.success;
  } catch (error) {
    console.error('Error sending Telegram alert:', error);
    return false;
  }
}
