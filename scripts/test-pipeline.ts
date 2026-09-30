/**
 * Unit checks for the pure matching / rule-building layer (no network, no DB).
 * Run: npm test   (npx tsx scripts/test-pipeline.ts)
 */

import {
  buildStreamRules,
  diffRules,
  findMatches,
  keywordMatches,
  normalizeAccount,
  X_RULE_MAX_LENGTH,
} from '../src/lib/services/twitter/matching';
import {
  normalizeStreamPayload,
  tweetTypeFromPayload,
} from '../src/lib/services/twitter/providers/x-filtered-stream';
import type { SocialAlertRow, TweetData } from '../src/lib/services/twitter/types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ ${name}`);
    failed++;
  }
}

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

// ---------------------------------------------------------------
console.log('\n=== normalizeAccount / keywordMatches ===\n');

assert(normalizeAccount(' @AzizKleinberg ') === 'azizkleinberg', 'strips @ and lowercases');
assert(keywordMatches('La farandole des cryptos', 'farandole'), 'plain word matches');
assert(keywordMatches('FARANDOLE en majuscules', 'farandole'), 'case-insensitive');
assert(!keywordMatches('this method works', 'eth'), '"eth" does not match "method"');
assert(!keywordMatches('the solution is here', 'sol'), '"sol" does not match "solution"');
assert(keywordMatches('buying $SOL today', 'sol'), 'cashtag $SOL matches "sol"');
assert(keywordMatches('#btc to the moon', '$btc'), 'keyword with $ matches hashtag form');
assert(keywordMatches('bitcoin etf approved', 'bitcoin etf'), 'multi-word phrase matches');
assert(!keywordMatches('etf bitcoin', 'bitcoin etf'), 'multi-word phrase respects order');

// ---------------------------------------------------------------
console.log('\n=== findMatches: per-account isolation and tweet types ===\n');

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

const tweets: TweetData[] = [
  tweet({ id: '1', text: 'La farandole des cryptos continue ce matin !', author: 'AzizKleinberg' }),
  tweet({ id: '2', text: "Rien de spécial aujourd'hui", author: 'AzizKleinberg' }),
  tweet({ id: '3', text: 'FARANDOLE en majuscules aussi', author: 'azizkleinberg' }),
  tweet({ id: '4', text: 'La farandole vue par quelqu un d autre', author: 'autrecompte' }),
  tweet({ id: '5', text: 'farandole en réponse', author: 'AzizKleinberg', type: 'reply' }),
  tweet({ id: '6', text: 'RT @x: farandole retweetée', author: 'AzizKleinberg', type: 'retweet' }),
  tweet({ id: '7', text: '$BTC en réponse chez l autre', author: 'autrecompte', type: 'reply' }),
];

const matches = findMatches([alertAziz, alertOtherUser], tweets);
const ids = (alertId: string) =>
  matches
    .filter((m) => m.alert.id === alertId)
    .map((m) => m.tweet.id)
    .toSorted();

assert(
  JSON.stringify(ids('alert-aziz')) === JSON.stringify(['1', '3']),
  'aziz alert matches only tweets 1 and 3'
);
assert(
  !ids('alert-aziz').includes('4'),
  'tweet from another account never matches (no cross-user leak)'
);
assert(!ids('alert-aziz').includes('5'), 'reply ignored when include_replies is false');
assert(!ids('alert-aziz').includes('6'), 'retweet always ignored');
assert(
  JSON.stringify(ids('alert-other')) === JSON.stringify(['7']),
  'reply matched when include_replies is true'
);
assert(
  matches.find((m) => m.tweet.id === '1')?.matchedKeywords.join(',') === 'farandole',
  'matchedKeywords reported'
);

// ---------------------------------------------------------------
console.log('\n=== buildStreamRules ===\n');

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

const azizRule = rules.find((r) => r.tag === 'azizkleinberg');
assert(rules.length === 2, `one rule per active account (got ${rules.length})`);
assert(
  azizRule?.value ===
    'from:azizkleinberg ("bitcoin etf" OR farandole) -is:retweet -is:reply -is:quote',
  `aziz rule merges keywords across users, quotes phrases, excludes replies (got: ${azizRule?.value})`
);
assert(
  rules.find((r) => r.tag === 'autrecompte')?.value === 'from:autrecompte (btc) -is:retweet',
  'include_replies keeps replies and quotes but still drops retweets'
);

const many = buildStreamRules([
  {
    id: 'big',
    user_id: 'u',
    platform: 'twitter',
    account: 'bigaccount',
    keywords: Array.from({ length: 120 }, (_, i) => `keyword${i}longenough`),
  },
]);
assert(many.length > 1, `long keyword lists are split into several rules (got ${many.length})`);
assert(
  many.every((r) => r.value.length <= X_RULE_MAX_LENGTH),
  'every rule stays under 1024 chars'
);
assert(
  many.every((r) => r.tag.startsWith('bigaccount')),
  'split rules keep the account tag'
);

const diff = diffRules(rules, [
  { id: 'r1', value: azizRule?.value ?? '' },
  { id: 'r2', value: 'from:stale (foo) -is:retweet' },
]);
assert(diff.toAdd.length === 1 && diff.toAdd[0].tag === 'autrecompte', 'diff adds missing rule');
assert(JSON.stringify(diff.toDeleteIds) === JSON.stringify(['r2']), 'diff deletes stale rule');

// ---------------------------------------------------------------
console.log('\n=== X stream payload normalization ===\n');

const payload = {
  data: {
    id: '1970000000000000000',
    text: 'farandole !',
    created_at: '2026-09-30T10:00:00.000Z',
    referenced_tweets: [{ type: 'quoted' as const, id: '1' }],
  },
  matching_rules: [{ id: 'r', tag: 'azizkleinberg#1' }],
};
const normalized = normalizeStreamPayload(payload);
assert(
  normalized?.author.userName === 'azizkleinberg',
  'author recovered from rule tag (chunk suffix stripped)'
);
assert(normalized?.type === 'quote', 'quote type detected');
assert(
  tweetTypeFromPayload({ id: '1', text: 'x' }) === 'original',
  'no referenced_tweets = original'
);
assert(
  tweetTypeFromPayload({
    id: '1',
    text: 'x',
    referenced_tweets: [{ type: 'retweeted', id: '2' }],
  }) === 'retweet',
  'retweet detected'
);
assert(
  normalizeStreamPayload({ data: payload.data }) === null,
  'payload without matching rule is dropped'
);

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

if (failed > 0) {
  throw new Error(`${String(failed)} tests failed`);
}
