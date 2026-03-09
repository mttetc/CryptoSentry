import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/server';
import { verifyWebhookSignature } from '@/actions/messaging/providers/telegram';
import {
  extractUserFromTelegramMessage,
  sendTelegramMessage,
  answerCallbackQuery,
} from '@/actions/messaging/providers/telegram/telegram-utils';

// --- Pure functions ---

function parseConnectUserId(text: string): string | null {
  if (!text.startsWith('/start connect_')) {
    return null;
  }
  return text.split('connect_')[1] || null;
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
    const signature = request.headers.get('x-telegram-bot-api-secret-token');
    const timestamp = request.headers.get('x-telegram-bot-api-timestamp');

    if (!signature || !timestamp) {
      return NextResponse.json({ error: 'Missing signature or timestamp' }, { status: 400 });
    }

    const payload = await request.text();
    const isValid = await verifyWebhookSignature(payload, signature, timestamp);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const update = JSON.parse(payload);

    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return NextResponse.json({ success: true });
    }

    const message = update.message;
    if (!message) {
      return NextResponse.json({ error: 'No message in update' }, { status: 400 });
    }

    const userInfo = await extractUserFromTelegramMessage(message);
    if (!userInfo) {
      return NextResponse.json({ error: 'Could not extract user info' }, { status: 400 });
    }

    const connectUserId = parseConnectUserId(message.text || '');
    if (connectUserId) {
      await handleConnectCommand(connectUserId, userInfo.userId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing Telegram webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
