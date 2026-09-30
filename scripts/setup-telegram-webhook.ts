/**
 * Register (or inspect) the Telegram webhook. Runs locally with your .env, never exposed as a route.
 *
 *   npx tsx --env-file=.env scripts/setup-telegram-webhook.ts https://your-domain.com
 *   npx tsx --env-file=.env scripts/setup-telegram-webhook.ts --info
 */

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const arg = process.argv[2];

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is not set');
}

const api = `https://api.telegram.org/bot${token}`;

async function main(): Promise<void> {
  if (arg === '--info') {
    const res = await fetch(`${api}/getWebhookInfo`);
    console.log(JSON.stringify(await res.json(), null, 2));
    return;
  }

  const appUrl = arg ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl?.startsWith('https://')) {
    throw new Error('Pass a public https URL as first argument (Telegram requires https)');
  }
  if (!secret || secret.length < 16) {
    throw new Error(
      'TELEGRAM_WEBHOOK_SECRET must be set (at least 16 chars, e.g. openssl rand -hex 32)'
    );
  }

  const webhookUrl = `${appUrl.replace(/\/$/, '')}/api/webhooks/telegram`;
  const res = await fetch(`${api}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: true,
    }),
  });

  console.log(`Webhook: ${webhookUrl}`);
  console.log(JSON.stringify(await res.json(), null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  throw error;
});
