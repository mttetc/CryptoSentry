import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/server';
import {
  sendTelegramMessage,
  answerCallbackQuery,
} from '@/actions/messaging/providers/telegram/telegram-utils';
import { verifyConnectToken } from '@/lib/telegram-connect-token';

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? 'cryptosentry-webhook-secret';

// --- Pure functions ---

function parseConnectToken(text: string): string | null {
  if (!text.startsWith('/start ')) {
    return null;
  }
  return text.slice('/start '.length).trim() || null;
}

// --- Single-responsibility I/O ---

async function handleCallbackQuery(callbackQuery: Record<string, unknown>): Promise<void> {
  const data = callbackQuery.data as string;
  const chatId = (callbackQuery.message as Record<string, unknown>).chat as Record<string, unknown>;

  if (data.startsWith('action_') && data.replace('action_', '') === 'help') {
    await sendTelegramMessage(
      String(chatId.id),
      'CryptoSentry is a cryptocurrency monitoring service. You will receive alerts about significant price movements and other important events.'
    );
  }

  await answerCallbackQuery(callbackQuery.id as string);
}

async function handleConnectCommand(appUserId: string, telegramChatId: string): Promise<void> {
  const supabase = createServiceSupabaseClient();

  const { error } = await supabase
    .from('user_telegram_settings')
    .upsert({
      user_id: appUserId,
      telegram_chat_id: telegramChatId,
      status: 'connected',
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Failed to update telegram settings:', error);
    throw error;
  }

  await sendTelegramMessage(
    telegramChatId,
    'Your Telegram account has been successfully connected! You will now receive notifications here.'
  );
}

// --- Route handler ---

export async function POST(request: Request) {
  try {
    // Verify secret token (set during webhook registration)
    const secretToken = request.headers.get('x-telegram-bot-api-secret-token');
    if (secretToken !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const update = await request.json();

    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return NextResponse.json({ success: true });
    }

    const message = update.message;
    if (!message?.from?.id) {
      return NextResponse.json({ success: true }); // Ignore non-message updates
    }

    const chatId = String(message.chat.id);
    const connectToken = parseConnectToken(message.text || '');

    if (connectToken) {
      const { userId: appUserId, valid } = verifyConnectToken(connectToken);
      if (!valid) {
        await sendTelegramMessage(
          chatId,
          'This connect link is invalid. Please scan a new QR code from your dashboard.'
        );
        return NextResponse.json({ success: true });
      }
      await handleConnectCommand(appUserId, chatId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing Telegram webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
