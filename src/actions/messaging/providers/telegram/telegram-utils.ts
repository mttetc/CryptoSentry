import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createHmac } from 'node:crypto';

function requireTelegramBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
  }
  return token;
}

export const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

export interface TelegramUser {
  id: string;
  telegram_chat_id: string;
  telegram_username?: string;
}

export interface TelegramMessage {
  from?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
  };
  chat?: {
    id: number;
    type: string;
  };
  text?: string;
  date?: number;
}

export async function sendTelegramMessage(chatId: string, message: string): Promise<boolean> {
  try {
    const token = requireTelegramBotToken();
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}

export async function answerCallbackQuery(callbackQueryId: string): Promise<boolean> {
  try {
    const token = requireTelegramBotToken();
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error answering callback query:', error);
    return false;
  }
}

export async function extractUserFromTelegramMessage(
  message: TelegramMessage
): Promise<{ userId: string } | null> {
  try {
    if (!message.from) {
      return null;
    }

    return {
      userId: message.from.id.toString(),
    };
  } catch (error) {
    console.error('Error extracting user from Telegram message:', error);
    return null;
  }
}

export async function getTelegramUser(userId: string): Promise<TelegramUser | null> {
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

export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  _timestamp: string
): Promise<boolean> {
  if (process.env.SKIP_WEBHOOK_VERIFY === 'true') {
    return true;
  }

  try {
    const token = requireTelegramBotToken();
    const secretKey = createHmac('sha256', 'WebAppData').update(token).digest();
    const expectedSignature = createHmac('sha256', secretKey)
      .update(payload)
      .digest('hex');

    return expectedSignature === signature;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}
