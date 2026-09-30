import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceSupabaseClient } from '@/lib/supabase/server';
import {
  sendTelegramMessage,
  answerCallbackQuery,
} from '@/actions/messaging/providers/telegram/telegram-utils';
import { verifyConnectToken } from '@/lib/telegram-connect-token';

// --- Payload validation (only the fields we use) ---

const updateSchema = z.object({
  message: z
    .object({
      chat: z.object({ id: z.union([z.number(), z.string()]) }),
      from: z.object({ id: z.union([z.number(), z.string()]) }).optional(),
      text: z.string().optional(),
    })
    .optional(),
  callback_query: z
    .object({
      id: z.string(),
      data: z.string().optional(),
      message: z.object({ chat: z.object({ id: z.union([z.number(), z.string()]) }) }).optional(),
    })
    .optional(),
});

// --- Pure functions ---

function secretMatches(header: string | null): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected || !header) {
    return false;
  }
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function parseConnectToken(text: string): string | null {
  if (!text.startsWith('/start ')) {
    return null;
  }
  return text.slice('/start '.length).trim() || null;
}

// --- Single-responsibility I/O ---

async function handleCallbackQuery(
  query: z.infer<typeof updateSchema>['callback_query']
): Promise<void> {
  if (!query) {
    return;
  }
  if (query.data === 'action_help' && query.message) {
    await sendTelegramMessage(
      String(query.message.chat.id),
      'CryptoSentry sends you alerts when the X accounts you watch mention your keywords, and when prices cross your targets.'
    );
  }
  await answerCallbackQuery(query.id);
}

async function handleConnectCommand(appUserId: string, telegramChatId: string): Promise<void> {
  const supabase = createServiceSupabaseClient();

  const { error } = await supabase.from('user_telegram_settings').upsert(
    {
      user_id: appUserId,
      telegram_chat_id: telegramChatId,
      status: 'connected',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.error('Failed to update telegram settings:', error);
    throw error;
  }

  await sendTelegramMessage(
    telegramChatId,
    'Your Telegram account is connected. You will receive your CryptoSentry alerts here.'
  );
}

// --- Route handler ---

export async function POST(request: Request) {
  if (!process.env.TELEGRAM_WEBHOOK_SECRET) {
    console.error('[Telegram] TELEGRAM_WEBHOOK_SECRET is not set; refusing webhook traffic');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  if (!secretMatches(request.headers.get('x-telegram-bot-api-secret-token'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    // Always 200 to Telegram for unknown update shapes, otherwise it retries forever.
    return NextResponse.json({ success: true, ignored: true });
  }

  try {
    const update = parsed.data;

    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return NextResponse.json({ success: true });
    }

    const message = update.message;
    if (!message?.from) {
      return NextResponse.json({ success: true });
    }

    const chatId = String(message.chat.id);
    const connectToken = parseConnectToken(message.text ?? '');

    if (connectToken) {
      const { userId: appUserId, valid, reason } = verifyConnectToken(connectToken);
      if (!valid) {
        await sendTelegramMessage(
          chatId,
          reason === 'expired'
            ? 'This connect link has expired. Open your dashboard and scan the new QR code.'
            : 'This connect link is invalid. Open your dashboard and scan the QR code again.'
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
