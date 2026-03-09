/**
 * Test the tweet pipeline pure functions (dedup + matching) without Supabase.
 * Run: npx tsx scripts/test-pipeline.ts
 */

import type { TweetData, SocialAlertRow } from '../src/lib/services/twitter/types';

// --- Inline the pure functions to avoid importing Supabase-dependent module ---

const seenTweetIds = new Set<string>();

function dedup(tweets: TweetData[]): TweetData[] {
  const fresh: TweetData[] = [];
  for (const tweet of tweets) {
    if (seenTweetIds.has(tweet.id)) {
      continue;
    }
    seenTweetIds.add(tweet.id);
    fresh.push(tweet);
  }
  return fresh;
}

function findMatches(
  alerts: SocialAlertRow[],
  tweets: TweetData[]
): { alert: SocialAlertRow; tweet: TweetData }[] {
  const index = alerts.flatMap((alert) =>
    alert.keywords.map((keyword) => ({ keyword: keyword.toLowerCase(), alert }))
  );
  const matches: { alert: SocialAlertRow; tweet: TweetData }[] = [];

  for (const tweet of tweets) {
    const lowerText = tweet.text.toLowerCase();
    const matchedAlertIds = new Set<string>();
    for (const { keyword, alert } of index) {
      if (matchedAlertIds.has(alert.id)) {
        continue;
      }
      if (lowerText.includes(keyword)) {
        matchedAlertIds.add(alert.id);
        matches.push({ alert, tweet });
      }
    }
  }
  return matches;
}

// --- Test helpers ---

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

// ============================================================
// Test: surveiller @AzizKleinberg, mot-clé "farandole"
// ============================================================

console.log('\n=== Surveillance @AzizKleinberg — mot-clé "farandole" ===\n');

const alert: SocialAlertRow = {
  id: 'alert-aziz',
  user_id: 'user-test',
  platform: 'twitter',
  account: 'AzizKleinberg',
  keywords: ['farandole'],
};

const tweets: TweetData[] = [
  {
    id: '1',
    text: 'La farandole des cryptos continue ce matin !',
    author: { userName: 'AzizKleinberg', displayName: 'Aziz Kleinberg' },
    createdAt: '2026-03-08T20:00:00Z',
    url: 'https://x.com/AzizKleinberg/status/1',
  },
  {
    id: '2',
    text: 'Rien de spécial aujourd\'hui',
    author: { userName: 'AzizKleinberg', displayName: 'Aziz Kleinberg' },
    createdAt: '2026-03-08T20:01:00Z',
    url: 'https://x.com/AzizKleinberg/status/2',
  },
  {
    id: '3',
    text: 'FARANDOLE en majuscules aussi',
    author: { userName: 'AzizKleinberg', displayName: 'Aziz Kleinberg' },
    createdAt: '2026-03-08T20:02:00Z',
    url: 'https://x.com/AzizKleinberg/status/3',
  },
  {
    id: '4',
    text: 'La farandole vue par quelqu\'un d\'autre',
    author: { userName: 'autrecompte', displayName: 'Autre' },
    createdAt: '2026-03-08T20:03:00Z',
    url: 'https://x.com/autrecompte/status/4',
  },
  {
    // Duplicate of tweet 1
    id: '1',
    text: 'La farandole des cryptos continue ce matin !',
    author: { userName: 'AzizKleinberg', displayName: 'Aziz Kleinberg' },
    createdAt: '2026-03-08T20:00:00Z',
    url: 'https://x.com/AzizKleinberg/status/1',
  },
];

// Step 1: Dedup
const fresh = dedup(tweets);
assert(fresh.length === 4, `dedup: 5 tweets → 4 uniques (got ${fresh.length})`);

// Step 2: Match
const matches = findMatches([alert], fresh);

console.log('\n  Matches trouvés:');
for (const m of matches) {
  console.log(`    → @${m.tweet.author.userName}: "${m.tweet.text.slice(0, 50)}..."`);
}

assert(matches.length === 3, `3 tweets contiennent "farandole" (got ${matches.length})`);
assert(matches.some((m) => m.tweet.id === '1'), 'tweet 1 matche (farandole lowercase)');
assert(matches.some((m) => m.tweet.id === '3'), 'tweet 3 matche (FARANDOLE uppercase)');
assert(matches.some((m) => m.tweet.id === '4'), 'tweet 4 matche (autre auteur, même keyword)');
assert(!matches.some((m) => m.tweet.id === '2'), 'tweet 2 ne matche pas (pas de farandole)');

// Step 3: Simulate what processTweets would return
const result = { processed: fresh.length, matched: matches.length, triggered: matches.length };
console.log('\n  ProcessingResult:', result);

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

if (failed > 0) {
  throw new Error(`${String(failed)} tests failed`);
}
