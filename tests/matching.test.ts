import { describe, expect, it } from 'vitest';
import {
  buildStreamRules,
  diffRules,
  findMatches,
  keywordMatches,
  normalizeAccount,
  utcMonthKey,
  X_RULE_MAX_LENGTH,
} from '@/lib/services/twitter/matching';
import type { SocialAlertRow, TweetData } from '@/lib/services/twitter/types';

function tweet(
  overrides: Omit<Partial<TweetData>, 'author'> & { id: string; text: string; author: string }
): TweetData {
  return {
    id: overrides.id,
    text: overrides.text,
    type: overrides.type ?? 'original',
    author: { userName: overrides.author },
    createdAt: overrides.createdAt ?? '2026-09-30T10:00:00Z',
    url: `https://x.com/${overrides.author}/status/${overrides.id}`,
  };
}

const alertAziz: SocialAlertRow = {
  id: 'alert-aziz',
  user_id: 'user-1',
  platform: 'twitter',
  account: 'AzizKleinberg',
  keywords: ['farandole'],
};

const alertOtherUser: SocialAlertRow = {
  id: 'alert-other',
  user_id: 'user-2',
  platform: 'twitter',
  account: 'autrecompte',
  keywords: ['btc'],
  include_replies: true,
};

describe('normalizeAccount / keywordMatches', () => {
  it('strips @ and lowercases handles', () => {
    expect(normalizeAccount(' @AzizKleinberg ')).toBe('azizkleinberg');
  });

  it('matches whole words case-insensitively', () => {
    expect(keywordMatches('La farandole des cryptos', 'farandole')).toBe(true);
    expect(keywordMatches('FARANDOLE en majuscules', 'farandole')).toBe(true);
  });

  it('does not match inside other words', () => {
    expect(keywordMatches('this method works', 'eth')).toBe(false);
    expect(keywordMatches('the solution is here', 'sol')).toBe(false);
  });

  it('handles cashtags and hashtags', () => {
    expect(keywordMatches('buying $SOL today', 'sol')).toBe(true);
    expect(keywordMatches('#btc to the moon', '$btc')).toBe(true);
  });

  it('matches multi-word phrases in order', () => {
    expect(keywordMatches('bitcoin etf approved', 'bitcoin etf')).toBe(true);
    expect(keywordMatches('etf bitcoin', 'bitcoin etf')).toBe(false);
  });
});

describe('findMatches', () => {
  const tweets: TweetData[] = [
    tweet({
      id: '1',
      text: 'La farandole des cryptos continue ce matin !',
      author: 'AzizKleinberg',
    }),
    tweet({ id: '2', text: "Rien de spécial aujourd'hui", author: 'AzizKleinberg' }),
    tweet({ id: '3', text: 'FARANDOLE en majuscules aussi', author: 'azizkleinberg' }),
    tweet({ id: '4', text: 'La farandole vue par quelqu un d autre', author: 'autrecompte' }),
    tweet({ id: '5', text: 'farandole en réponse', author: 'AzizKleinberg', type: 'reply' }),
    tweet({
      id: '6',
      text: 'RT @x: farandole retweetée',
      author: 'AzizKleinberg',
      type: 'retweet',
    }),
    tweet({ id: '7', text: '$BTC en réponse chez l autre', author: 'autrecompte', type: 'reply' }),
  ];
  const matches = findMatches([alertAziz, alertOtherUser], tweets);
  const ids = (alertId: string) =>
    matches
      .filter((m) => m.alert.id === alertId)
      .map((m) => m.tweet.id)
      .toSorted();

  it('only matches tweets from the alert account (no cross-user leak)', () => {
    expect(ids('alert-aziz')).toEqual(['1', '3']);
  });

  it('ignores replies unless the alert opted in, and always ignores retweets', () => {
    expect(ids('alert-aziz')).not.toContain('5');
    expect(ids('alert-aziz')).not.toContain('6');
    expect(ids('alert-other')).toEqual(['7']);
  });

  it('reports matched keywords', () => {
    expect(matches.find((m) => m.tweet.id === '1')?.matchedKeywords).toEqual(['farandole']);
  });

  it('skips inactive alerts', () => {
    expect(findMatches([{ ...alertAziz, is_active: false }], tweets)).toEqual([]);
  });
});

describe('buildStreamRules', () => {
  const rules = buildStreamRules([
    alertAziz,
    { ...alertAziz, id: 'alert-aziz-2', user_id: 'user-9', keywords: ['bitcoin etf', 'Farandole'] },
    alertOtherUser,
    {
      id: 'inactive',
      user_id: 'u',
      platform: 'twitter',
      account: 'ghost',
      keywords: ['x'],
      is_active: false,
    },
  ]);

  it('builds one rule per active account, merging keywords across users', () => {
    expect(rules).toHaveLength(2);
    expect(rules.find((r) => r.tag === 'azizkleinberg')?.value).toBe(
      'from:azizkleinberg ("bitcoin etf" OR farandole) -is:retweet -is:reply -is:quote'
    );
  });

  it('keeps replies and quotes when at least one alert opted in, still dropping retweets', () => {
    expect(rules.find((r) => r.tag === 'autrecompte')?.value).toBe(
      'from:autrecompte (btc) -is:retweet'
    );
  });

  it('splits long keyword lists under the 1024-char X limit and keeps the account tag', () => {
    const many = buildStreamRules([
      {
        id: 'big',
        user_id: 'u',
        platform: 'twitter',
        account: 'bigaccount',
        keywords: Array.from({ length: 120 }, (_, i) => `keyword${i}longenough`),
      },
    ]);
    expect(many.length).toBeGreaterThan(1);
    expect(many.every((r) => r.value.length <= X_RULE_MAX_LENGTH)).toBe(true);
    expect(many.every((r) => r.tag.startsWith('bigaccount'))).toBe(true);
  });

  it('diffs desired vs remote rules by value', () => {
    const azizValue = rules.find((r) => r.tag === 'azizkleinberg')?.value ?? '';
    const diff = diffRules(rules, [
      { id: 'r1', value: azizValue },
      { id: 'r2', value: 'from:stale (foo) -is:retweet' },
    ]);
    expect(diff.toAdd.map((r) => r.tag)).toEqual(['autrecompte']);
    expect(diff.toDeleteIds).toEqual(['r2']);
  });
});

describe('utcMonthKey', () => {
  it('formats YYYY-MM in UTC', () => {
    expect(utcMonthKey(new Date('2026-09-30T23:59:59Z'))).toBe('2026-09');
    expect(utcMonthKey(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01');
  });
});
