import { describe, expect, it } from 'vitest';
import {
  buildTelegramConnectLink,
  CONNECT_TOKEN_TTL_MS,
  generateConnectToken,
  verifyConnectToken,
} from '@/lib/telegram-connect-token';

describe('telegram connect token', () => {
  const userId = 'user-with-dashes-1234';

  it('round-trips a user id', () => {
    const token = generateConnectToken(userId);
    expect(verifyConnectToken(token)).toEqual({ userId, valid: true });
  });

  it('only uses characters allowed in a Telegram start parameter', () => {
    expect(generateConnectToken(userId)).toMatch(/^[\w-]+$/);
    expect(generateConnectToken(userId).length).toBeLessThanOrEqual(64);
  });

  it('expires after the TTL', () => {
    const issuedAt = Date.now();
    const token = generateConnectToken(userId, issuedAt);
    expect(verifyConnectToken(token, issuedAt + CONNECT_TOKEN_TTL_MS - 1000).valid).toBe(true);
    expect(verifyConnectToken(token, issuedAt + CONNECT_TOKEN_TTL_MS + 1000)).toMatchObject({
      valid: false,
      reason: 'expired',
    });
  });

  it('rejects tampered signatures and user ids', () => {
    const token = generateConnectToken(userId);
    const [encoded, exp, sig] = token.split('--');
    const badSig = `${encoded}--${exp}--${sig.slice(0, -1)}${sig.at(-1) === 'a' ? 'b' : 'a'}`;
    expect(verifyConnectToken(badSig)).toMatchObject({ valid: false, reason: 'bad-signature' });

    const otherUser = Buffer.from('someone-else').toString('base64url');
    expect(verifyConnectToken(`${otherUser}--${exp}--${sig}`)).toMatchObject({
      valid: false,
      reason: 'bad-signature',
    });
  });

  it('rejects malformed tokens', () => {
    expect(verifyConnectToken('garbage').valid).toBe(false);
    expect(verifyConnectToken('a--b').valid).toBe(false);
    expect(verifyConnectToken('a--notanumber--c').valid).toBe(false);
  });

  it('builds the deep link with the configured bot', () => {
    expect(buildTelegramConnectLink(userId)).toMatch(
      /^https:\/\/t\.me\/CryptoSentryTestBot\?start=/
    );
  });
});
