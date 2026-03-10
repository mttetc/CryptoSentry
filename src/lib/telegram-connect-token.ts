import { createHmac } from 'node:crypto';

const SECRET = process.env.TELEGRAM_CONNECT_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export function generateConnectToken(userId: string): string {
  const sig = createHmac('sha256', SECRET).update(userId).digest('hex').slice(0, 16);
  return `${userId}.${sig}`;
}

export function verifyConnectToken(token: string): { userId: string; valid: boolean } {
  const dotIndex = token.lastIndexOf('.');
  if (dotIndex === -1) {
    return { userId: '', valid: false };
  }

  const userId = token.slice(0, dotIndex);
  const sig = token.slice(dotIndex + 1);
  if (!userId || !sig) {
    return { userId: '', valid: false };
  }

  const expected = createHmac('sha256', SECRET).update(userId).digest('hex').slice(0, 16);
  if (sig !== expected) {
    return { userId: '', valid: false };
  }

  return { userId, valid: true };
}
