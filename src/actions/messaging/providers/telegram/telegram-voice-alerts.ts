'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

interface TelegramVoiceAlert {
  userId: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

interface TelegramUser {
  id: string;
  telegram_chat_id: string;
  telegram_username?: string;
}

export async function sendTelegramVoiceAlert(alert: TelegramVoiceAlert): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    // Get user's Telegram chat ID
    const telegramUser = await getTelegramUser(alert.userId);

    if (!telegramUser) {
      return {
        success: false,
        error: 'User does not have Telegram linked',
      };
    }

    // Create urgent message with multiple notifications
    const urgentMessage = createUrgentMessage(alert.message, alert.priority);

    // Send multiple messages to simulate "calling" effect
    const results = await sendMultipleNotifications(
      telegramUser.telegram_chat_id,
      urgentMessage,
      alert.priority
    );

    return {
      success: results.success,
      messageId: results.messageId,
      error: results.error,
    };
  } catch (error) {
    console.error('Error sending Telegram voice alert:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function createUrgentMessage(message: string, priority: string): string {
  const urgencyLevel = getUrgencyLevel(priority);

  return `${urgencyLevel}\n\n🚨 CRYPTO ALERT 🚨\n\n${message}\n\n⚠️ URGENT: Check your portfolio now!\n\n📞 This is your Telegram voice alert!`;
}

function getUrgencyLevel(priority: string): string {
  switch (priority) {
    case 'urgent':
      return '🚨🚨🚨🚨 URGENT ALERT 🚨🚨🚨🚨';
    case 'high':
      return '🚨🚨🚨 HIGH PRIORITY 🚨🚨🚨';
    case 'normal':
      return '🔔 ALERT 🔔';
    default:
      return '📢 NOTIFICATION 📢';
  }
}

async function sendMultipleNotifications(
  chatId: string,
  message: string,
  priority: string
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const messageCount = getMessageCount(priority);
    let lastMessageId: string | undefined;

    // Send multiple messages to simulate "calling" effect
    for (let i = 0; i < messageCount; i++) {
      const response = await fetch(`${TELEGRAM_API_BASE}${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: i === 0 ? message : `🔔 Alert ${i + 1}/${messageCount} - ${message}`,
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
      lastMessageId = result.result?.message_id?.toString();

      // Small delay between messages
      if (i < messageCount - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return {
      success: true,
      messageId: lastMessageId,
    };
  } catch (error) {
    console.error('Error sending multiple notifications:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function getMessageCount(priority: string): number {
  switch (priority) {
    case 'urgent':
      return 5; // Send 5 messages for urgent alerts
    case 'high':
      return 3; // Send 3 messages for high priority
    case 'normal':
      return 2; // Send 2 messages for normal
    default:
      return 1; // Send 1 message for low priority
  }
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
