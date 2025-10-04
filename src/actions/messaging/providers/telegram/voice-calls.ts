'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

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

interface TelegramUser {
  id: string;
  telegram_chat_id: string;
  telegram_username?: string;
}

async function getTelegramUser(userId: string): Promise<TelegramUser | null> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('user_telegram_settings')
      .select('telegram_chat_id, telegram_username')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: userId,
      telegram_chat_id: data.telegram_chat_id,
      telegram_username: data.telegram_username,
    };
  } catch (error) {
    console.error('Error getting Telegram user:', error);
    return null;
  }
}

// Alternative: Use a simpler approach with pre-recorded voice messages
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

    // Send a text message with voice emoji and urgent formatting
    const urgentMessage = `🚨🚨🚨 CRYPTO ALERT 🚨🚨🚨\n\n${options.message}\n\n⚠️ URGENT: Check your portfolio now!\n\n📞 This is your Telegram voice alert!`;

    const response = await fetch(`${TELEGRAM_API_BASE}${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegramUser.telegram_chat_id,
        text: urgentMessage,
        parse_mode: 'HTML',
        disable_notification: false,
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ description: 'Unknown error' }));
      return {
        success: false,
        error: error.description || 'Failed to send message',
      };
    }

    const result = await response.json();

    return {
      success: true,
      messageId: result.result?.message_id?.toString(),
    };
  } catch (error) {
    console.error('Error sending Telegram voice call (simple):', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
