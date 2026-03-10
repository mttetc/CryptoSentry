import { createHmac } from 'node:crypto';

const SECRET = process.env.TELEGRAM_CONNECT_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// Telegram deep link `start` parameter only allows: a-z, A-Z, 0-9, _, -
// We base64url-encode the userId and use -- as separator (since userId may contain dashes)

function toBase64Url(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function fromBase64Url(str: string): string {
  return Buffer.from(str, 'base64url').toString();
}

export function generateConnectToken(userId: string): string {
  const sig = createHmac('sha256', SECRET).update(userId).digest('hex').slice(0, 16);
  return `${toBase64Url(userId)}--${sig}`;
}

export function verifyConnectToken(token: string): { userId: string; valid: boolean } {
  const sepIndex = token.indexOf('--');
  if (sepIndex === -1) {
    return { userId: '', valid: false };
  }

  const encodedUserId = token.slice(0, sepIndex);
  const sig = token.slice(sepIndex + 2);
  if (!encodedUserId || !sig) {
    return { userId: '', valid: false };
  }

  const userId = fromBase64Url(encodedUserId);
  const expected = createHmac('sha256', SECRET).update(userId).digest('hex').slice(0, 16);
  if (sig !== expected) {
    return { userId: '', valid: false };
  }

  return { userId, valid: true };
}
