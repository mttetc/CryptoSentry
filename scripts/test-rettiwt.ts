import { Rettiwt } from 'rettiwt-api';

const API_KEY = process.env.RETTIWT_API_KEY;
if (!API_KEY) {
  throw new Error('Set RETTIWT_API_KEY env var');
}

const rettiwt = new Rettiwt({ apiKey: API_KEY });

async function testSearch() {
  // Test 1: Verify API key works with a known account
  console.log('Test 1: Search @elonmusk...');
  try {
    const result = await rettiwt.tweet.search({ fromUsers: ['elonmusk'] }, 3);
    console.log(`  Found ${result.list.length} tweets`);
    for (const tweet of result.list) {
      console.log(`  [${tweet.id}] ${tweet.fullText.slice(0, 80)}`);
    }
  } catch (error) {
    console.error('  FAILED:', error instanceof Error ? error.message : error);
  }

  // Test 2: Search the user's account
  console.log('\nTest 2: Search @AzizKleinberg...');
  try {
    const result = await rettiwt.tweet.search({ fromUsers: ['AzizKleinberg'] }, 3);
    console.log(`  Found ${result.list.length} tweets`);
    for (const tweet of result.list) {
      console.log(`  [${tweet.id}] ${tweet.fullText.slice(0, 80)}`);
    }
  } catch (error) {
    console.error('  FAILED:', error instanceof Error ? error.message : error);
  }

  // Test 3: Lookup user then fetch timeline by ID
  console.log('\nTest 3: User lookup + timeline @AzizKleinberg...');
  try {
    const user = await rettiwt.user.details('AzizKleinberg');
    if (user) {
      console.log(`  User: @${user.userName} (${user.fullName}), id=${user.id}`);
      const timeline = await rettiwt.user.timeline(user.id, 5);
      console.log(`  Timeline: ${timeline.list.length} tweets`);
      for (const tweet of timeline.list) {
        console.log(`  [${tweet.id}] ${tweet.fullText.slice(0, 80)} (${tweet.createdAt})`);
      }
    } else {
      console.log('  User NOT FOUND');
    }
  } catch (error) {
    console.error('  FAILED:', error instanceof Error ? error.message : error);
  }
}

testSearch();
