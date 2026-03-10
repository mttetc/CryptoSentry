import { NextResponse } from 'next/server';
import { TELEGRAM_API_BASE } from '@/actions/messaging/providers/telegram/telegram-utils';

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? 'cryptosentry-webhook-secret';

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not set' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const appUrl = searchParams.get('url') ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json({ error: 'Provide ?url=https://your-domain.com' }, { status: 400 });
  }

  const webhookUrl = `${appUrl}/api/webhooks/telegram`;

  const response = await fetch(`${TELEGRAM_API_BASE}${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: WEBHOOK_SECRET,
      allowed_updates: ['message', 'callback_query'],
    }),
  });

  const result = await response.json();
  return NextResponse.json({ webhookUrl, telegram: result });
}
