import { createHmac, timingSafeEqual } from 'node:crypto';

// Telegram deep link `start` parameter only allows: a-z, A-Z, 0-9, _, - (max 64 chars).
// Token layout: <base64url(userId)>--<expiresAtSeconds>--<hmac16>
// The userId may itself contain dashes, hence the double-dash separator.

export const CONNECT_TOKEN_TTL_MS = 10 * 60 * 1000;

function requireSecret(): string {
  const secret = process.env.TELEGRAM_CONNECT_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error('TELEGRAM_CONNECT_SECRET (or BETTER_AUTH_SECRET) env var is required');
  }
  return secret;
}

function toBase64Url(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function fromBase64Url(str: string): string {
  return Buffer.from(str, 'base64url').toString();
}

function sign(userId: string, expiresAt: number): string {
  return createHmac('sha256', requireSecret())
    .update(`${userId}:${expiresAt}`)
    .digest('hex')
    .slice(0, 16);
}

export function generateConnectToken(userId: string, now = Date.now()): string {
  const expiresAt = Math.floor((now + CONNECT_TOKEN_TTL_MS) / 1000);
  return `${toBase64Url(userId)}--${expiresAt}--${sign(userId, expiresAt)}`;
}

export function verifyConnectToken(
  token: string,
  now = Date.now()
): { userId: string; valid: boolean; reason?: 'malformed' | 'expired' | 'bad-signature' } {
  const parts = token.split('--');
  if (parts.length !== 3) {
    return { userId: '', valid: false, reason: 'malformed' };
  }

  const [encodedUserId, expiresAtRaw, sig] = parts;
  const expiresAt = Number(expiresAtRaw);
  if (!encodedUserId || !sig || !Number.isInteger(expiresAt)) {
    return { userId: '', valid: false, reason: 'malformed' };
  }

  if (expiresAt * 1000 < now) {
    return { userId: '', valid: false, reason: 'expired' };
  }

  const userId = fromBase64Url(encodedUserId);
  const expected = sign(userId, expiresAt);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { userId: '', valid: false, reason: 'bad-signature' };
  }

  return { userId, valid: true };
}

/** Deep link the user opens (or scans) to connect their Telegram account. Server-side only. */
export function buildTelegramConnectLink(userId: string): string {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  if (!botUsername) {
    throw new Error('TELEGRAM_BOT_USERNAME env var is required');
  }
  return `https://t.me/${botUsername}?start=${generateConnectToken(userId)}`;
}
