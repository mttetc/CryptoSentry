// Pure functions: account normalization, keyword matching and X filtered-stream rule building.
// No I/O here; covered by tests/matching.test.ts (vitest).

import type { SocialAlertRow, TweetData } from './types';

// X pay-per-use limits (https://docs.x.com/x-api/posts/filtered-stream/introduction)
export const X_RULE_MAX_LENGTH = 1024;
export const X_DEFAULT_MAX_RULES = 900;

export function normalizeAccount(account: string): string {
  return account.trim().replace(/^@+/, '').toLowerCase();
}

export function normalizeKeyword(keyword: string): string {
  return keyword.trim().replaceAll(/\s+/g, ' ').toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/**
 * Word-boundary match so "eth" does not match "method" and "sol" does not match "solution".
 * Cashtags/hashtags ($btc, #btc) are matched with or without their prefix.
 */
export function keywordMatches(text: string, keyword: string): boolean {
  const kw = normalizeKeyword(keyword).replace(/^[#$]/, '');
  if (!kw) {
    return false;
  }
  const pattern = new RegExp(
    String.raw`(^|[^\p{L}\p{N}_])[#$]?${escapeRegExp(kw)}(?![\p{L}\p{N}_])`,
    'iu'
  );
  return pattern.test(text);
}

export interface Match {
  alert: SocialAlertRow;
  tweet: TweetData;
  matchedKeywords: string[];
}

/**
 * A tweet only matches alerts watching its author. Replies/quotes are dropped unless the alert
 * opted in; retweets are always dropped (the text is someone else's).
 */
export function findMatches(alerts: SocialAlertRow[], tweets: TweetData[]): Match[] {
  const byAccount = new Map<string, SocialAlertRow[]>();
  for (const alert of alerts) {
    if (alert.is_active === false) {
      continue;
    }
    const key = normalizeAccount(alert.account);
    const list = byAccount.get(key) ?? [];
    list.push(alert);
    byAccount.set(key, list);
  }

  const matches: Match[] = [];

  for (const tweet of tweets) {
    if (tweet.type === 'retweet') {
      continue;
    }
    const candidates = byAccount.get(normalizeAccount(tweet.author.userName));
    if (!candidates) {
      continue;
    }

    for (const alert of candidates) {
      if (tweet.type !== 'original' && !alert.include_replies) {
        continue;
      }
      const matchedKeywords = alert.keywords.filter((kw) => keywordMatches(tweet.text, kw));
      if (matchedKeywords.length > 0) {
        matches.push({ alert, tweet, matchedKeywords });
      }
    }
  }

  return matches;
}

// --- X filtered stream rules ---

export interface StreamRule {
  value: string;
  tag: string;
}

function quoteKeyword(keyword: string): string {
  const kw = normalizeKeyword(keyword);
  // A bare token may only hold letters, digits, _ and a leading # or $; anything else (spaces,
  // Hyphens, colons, parentheses and the like are X rule syntax and force an exact-phrase quote.
  const bareToken = /^[#$]?[\p{L}\p{N}_]+$/u;
  return bareToken.test(kw) ? kw : `"${kw.replaceAll('"', '')}"`;
}

/**
 * One rule per watched account (or several when the OR-group exceeds 1024 chars):
 *   from:handle (kw1 OR "two words" OR kw3) -is:retweet -is:reply -is:quote
 * Replies/quotes are only allowed when at least one alert on that account opted in; the
 * pipeline still filters per-alert afterwards.
 */
export function buildStreamRules(alerts: SocialAlertRow[]): StreamRule[] {
  interface AccountGroup {
    keywords: Set<string>;
    includeReplies: boolean;
  }
  const groups = new Map<string, AccountGroup>();

  for (const alert of alerts) {
    if (alert.is_active === false || alert.platform !== 'twitter') {
      continue;
    }
    const account = normalizeAccount(alert.account);
    if (!account) {
      continue;
    }
    const group = groups.get(account) ?? { keywords: new Set<string>(), includeReplies: false };
    for (const kw of alert.keywords) {
      const q = quoteKeyword(kw);
      if (q) {
        group.keywords.add(q);
      }
    }
    group.includeReplies = group.includeReplies || Boolean(alert.include_replies);
    groups.set(account, group);
  }

  const rules: StreamRule[] = [];

  for (const [account, group] of groups) {
    const prefix = `from:${account} (`;
    const suffix = group.includeReplies ? ') -is:retweet' : ') -is:retweet -is:reply -is:quote';
    const budget = X_RULE_MAX_LENGTH - prefix.length - suffix.length;

    let chunk: string[] = [];
    let chunkLength = 0;
    let index = 0;

    const flush = () => {
      if (chunk.length === 0) {
        return;
      }
      rules.push({
        value: `${prefix}${chunk.join(' OR ')}${suffix}`,
        tag: index === 0 ? account : `${account}#${index}`,
      });
      index += 1;
      chunk = [];
      chunkLength = 0;
    };

    for (const kw of [...group.keywords].toSorted()) {
      const addition = kw.length + (chunk.length > 0 ? 4 : 0); // ' OR '
      if (chunkLength + addition > budget) {
        flush();
      }
      chunk.push(kw);
      chunkLength += kw.length + (chunk.length > 1 ? 4 : 0);
    }
    flush();
  }

  return rules;
}

/** Diff desired vs remote rules by value. */
export function diffRules<T extends { value: string }>(
  desired: StreamRule[],
  remote: (T & { id: string })[]
): { toAdd: StreamRule[]; toDeleteIds: string[] } {
  const desiredValues = new Set(desired.map((r) => r.value));
  const remoteValues = new Set(remote.map((r) => r.value));

  return {
    toAdd: desired.filter((r) => !remoteValues.has(r.value)),
    toDeleteIds: remote.filter((r) => !desiredValues.has(r.value)).map((r) => r.id),
  };
}

/** The account a delivered post belongs to, recovered from the matching rule tag. */
export function accountFromTag(tag: string): string {
  return tag.split('#')[0];
}

export function utcMonthKey(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
