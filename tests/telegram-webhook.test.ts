import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server, SUPABASE_REST, TELEGRAM_API } from './setup';
import { POST as postWebhook } from '@/app/api/webhooks/telegram/route';
import { generateConnectToken } from '@/lib/telegram-connect-token';

const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? '';

function mockTelegramAndSupabase() {
  const captured = {
    messages: [] as { chat_id: string; text: string }[],
    upserts: [] as Record<string, unknown>[],
  };
  server.use(
    http.post(`${TELEGRAM_API}/sendMessage`, async ({ request }) => {
      captured.messages.push((await request.json()) as { chat_id: string; text: string });
      return HttpResponse.json({ ok: true });
    }),
    http.post(`${SUPABASE_REST}/user_telegram_settings`, async ({ request }) => {
      captured.upserts.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json([], { status: 201 });
    })
  );
  return captured;
}

function webhookRequest(body: unknown, secret: string | null = SECRET) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (secret !== null) {
    headers['x-telegram-bot-api-secret-token'] = secret;
  }
  return new Request('http://localhost/api/webhooks/telegram', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function startMessage(token: string) {
  return { message: { chat: { id: 4242 }, from: { id: 4242 }, text: `/start ${token}` } };
}

describe('POST /api/webhooks/telegram', () => {
  it('rejects requests without the correct secret header', async () => {
    mockTelegramAndSupabase();
    const missing = await postWebhook(webhookRequest({}, null));
    const wrong = await postWebhook(webhookRequest({}, 'wrong'));
    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
  });

  it('acknowledges unknown update shapes without doing anything', async () => {
    const captured = mockTelegramAndSupabase();
    const response = await postWebhook(webhookRequest({ edited_message: { foo: 'bar' } }));
    expect(response.status).toBe(200);
    expect(captured.messages).toHaveLength(0);
    expect(captured.upserts).toHaveLength(0);
  });

  it('links the Telegram chat to the app user for a valid connect token', async () => {
    const captured = mockTelegramAndSupabase();
    const response = await postWebhook(
      webhookRequest(startMessage(generateConnectToken('user-abc')))
    );

    expect(response.status).toBe(200);
    expect(captured.upserts[0]).toMatchObject({
      user_id: 'user-abc',
      telegram_chat_id: '4242',
      status: 'connected',
    });
    expect(captured.messages[0]).toMatchObject({ chat_id: '4242' });
    expect(captured.messages[0].text).toMatch(/connected/i);
  });

  it('refuses expired tokens and tells the user to rescan', async () => {
    const captured = mockTelegramAndSupabase();
    const expired = generateConnectToken('user-abc', Date.now() - 11 * 60 * 1000);
    const response = await postWebhook(webhookRequest(startMessage(expired)));

    expect(response.status).toBe(200);
    expect(captured.upserts).toHaveLength(0);
    expect(captured.messages[0].text).toMatch(/expired/i);
  });

  it('refuses forged tokens', async () => {
    const captured = mockTelegramAndSupabase();
    const forged = `${Buffer.from('victim').toString('base64url')}--9999999999--deadbeefdeadbeef`;
    await postWebhook(webhookRequest(startMessage(forged)));

    expect(captured.upserts).toHaveLength(0);
    expect(captured.messages[0].text).toMatch(/invalid/i);
  });

  it('answers callback queries', async () => {
    const answered: string[] = [];
    mockTelegramAndSupabase();
    server.use(
      http.post(`${TELEGRAM_API}/answerCallbackQuery`, async ({ request }) => {
        answered.push(((await request.json()) as { callback_query_id: string }).callback_query_id);
        return HttpResponse.json({ ok: true });
      })
    );
    const response = await postWebhook(
      webhookRequest({
        callback_query: { id: 'cb-1', data: 'action_help', message: { chat: { id: 1 } } },
      })
    );
    expect(response.status).toBe(200);
    expect(answered).toEqual(['cb-1']);
  });
});
