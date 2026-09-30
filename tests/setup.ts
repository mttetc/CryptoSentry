import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';

// Environment expected by the modules under test. Set before any import resolves them.
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
process.env.TELEGRAM_BOT_TOKEN = '123456:test-bot-token';
process.env.TELEGRAM_BOT_USERNAME = 'CryptoSentryTestBot';
process.env.TELEGRAM_WEBHOOK_SECRET = 'webhook-secret-for-tests-0123456789';
process.env.TELEGRAM_CONNECT_SECRET = 'connect-secret-for-tests';
delete process.env.OPENAI_API_KEY;
delete process.env.X_BEARER_TOKEN;

/** Every outbound fetch (X API, Telegram, Supabase PostgREST) goes through msw. */
export const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

export const SUPABASE_REST = 'https://supabase.test/rest/v1';
export const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
export const X_API = 'https://api.x.com/2';

export function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Poll until `predicate` is true (default 3s). */
export async function waitFor(predicate: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('waitFor: condition not met in time');
    }
    await sleep(10);
  }
}
