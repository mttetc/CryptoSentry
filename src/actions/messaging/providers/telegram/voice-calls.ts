'use server';

import { sendTelegramMessage, getTelegramUser } from './telegram-utils';

interface VoiceCallOptions {
  userId: string;
  message: string;
  priority?: 'low' | 'normal' | 'high';
}

interface VoiceCallResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendTelegramVoiceCallSimple(
  options: VoiceCallOptions
): Promise<VoiceCallResponse> {
  try {
    const telegramUser = await getTelegramUser(options.userId);

    if (!telegramUser) {
      return {
        success: false,
        error: 'User does not have Telegram linked',
      };
    }

    const urgentMessage = `🚨🚨🚨 CRYPTO ALERT 🚨🚨🚨\n\n${options.message}\n\n⚠️ URGENT: Check your portfolio now!\n\n📞 This is your Telegram voice alert!`;

    const sent = await sendTelegramMessage(telegramUser.telegram_chat_id, urgentMessage);

    if (!sent) {
      return {
        success: false,
        error: 'Failed to send message',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error sending Telegram voice call (simple):', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
