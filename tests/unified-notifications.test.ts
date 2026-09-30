import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server, SUPABASE_REST, TELEGRAM_API } from './setup';
import { sendUnifiedAlert } from '@/actions/messaging/unified-notifications';
import type { AlertNotification } from '@/types/notifications';

const TELNYX = 'https://api.telnyx.com/v2/messages';

const notification: AlertNotification = {
  userId: 'user-pro',
  alertType: 'price',
  alertId: '11111111-1111-1111-1111-111111111111',
  message: 'BTC has risen above your target of $100000. Current price: $100500',
  data: { symbol: 'BTC', price: 100_500, targetPrice: 100_000, condition: 'above $100000' },
};

function mock(options: { plan: string; smsUsed: number; channels: string[] }) {
  const captured = { telegram: 0, sms: 0, logs: [] as Record<string, unknown>[] };

  server.use(
    http.get(`${SUPABASE_REST}/user_plans`, () => HttpResponse.json([{ plan: options.plan }])),
    http.get(`${SUPABASE_REST}/notification_channels`, () =>
      HttpResponse.json(
        options.channels.map((type, i) => ({
          id: `ch-${i}`,
          channel_type: type,
          config: type === 'sms' ? { phone: '+33600000000' } : {},
          alert_types: ['price', 'social'],
          is_active: true,
        }))
      )
    ),
    http.head(
      `${SUPABASE_REST}/alert_delivery_logs`,
      () =>
        new HttpResponse(null, {
          status: 200,
          headers: { 'Content-Range': `0-${Math.max(options.smsUsed - 1, 0)}/${options.smsUsed}` },
        })
    ),
    http.get(`${SUPABASE_REST}/user_telegram_settings`, () =>
      HttpResponse.json([
        { status: 'connected', telegram_chat_id: '4242', telegram_username: null },
      ])
    ),
    http.post(`${TELEGRAM_API}/sendMessage`, () => {
      captured.telegram += 1;
      return HttpResponse.json({ ok: true });
    }),
    http.post(TELNYX, () => {
      captured.sms += 1;
      return HttpResponse.json({ data: { id: 'msg' } });
    }),
    http.post(`${SUPABASE_REST}/alert_delivery_logs`, async ({ request }) => {
      captured.logs.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json([], { status: 201 });
    })
  );

  return captured;
}

describe('sendUnifiedAlert SMS quota', () => {
  beforeEach(() => {
    process.env.TELNYX_API_KEY = 'telnyx-test';
    process.env.TELNYX_FROM_NUMBER = '+33700000000';
  });

  afterEach(() => {
    delete process.env.TELNYX_API_KEY;
    delete process.env.TELNYX_FROM_NUMBER;
  });

  it('sends the SMS while the plan quota has room', async () => {
    const captured = mock({ plan: 'pro', smsUsed: 5, channels: ['sms'] });

    const result = await sendUnifiedAlert(notification);

    expect(captured.sms).toBe(1);
    expect(captured.telegram).toBe(0);
    expect(result.overallSuccess).toBe(true);
  });

  it('falls back to Telegram once the monthly SMS quota is reached', async () => {
    const captured = mock({ plan: 'pro', smsUsed: 30, channels: ['sms'] });

    const result = await sendUnifiedAlert(notification);

    expect(captured.sms).toBe(0);
    expect(captured.telegram).toBe(1);
    expect(result.channels.sms).toMatchObject({ success: false });
    expect(result.channels.sms.error).toMatch(/SMS quota reached \(30\/30\)/);
    expect(result.channels.telegram).toEqual({ success: true });
    expect(result.overallSuccess).toBe(true);
  });

  it('never sends SMS on a plan without SMS, even with a channel row left over', async () => {
    const captured = mock({ plan: 'free', smsUsed: 0, channels: ['sms', 'telegram'] });

    await sendUnifiedAlert(notification);

    // Free allows Telegram only: the sms row is filtered out before any quota check
    expect(captured.sms).toBe(0);
    expect(captured.telegram).toBe(1);
  });
});
