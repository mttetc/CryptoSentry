import { createServiceSupabaseClient } from '@/lib/supabase/server';
import { fetchPrices } from '@/lib/services/crypto/coingecko';
import { detectTokens } from './token-detector';

const PROCESS_INTERVAL_MS = 300_000; // 5 minutes

// Map common token symbols to CoinGecko IDs
const SYMBOL_TO_COINGECKO: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  DOGE: 'dogecoin',
  ADA: 'cardano',
  XRP: 'ripple',
  DOT: 'polkadot',
  AVAX: 'avalanche-2',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  UNI: 'uniswap',
  AAVE: 'aave',
  ATOM: 'cosmos',
  NEAR: 'near',
  ARB: 'arbitrum',
  OP: 'optimism',
};

function symbolToCoingeckoId(symbol: string): string | undefined {
  return SYMBOL_TO_COINGECKO[symbol.toUpperCase()];
}

interface StaleEvent {
  id: string;
  token_symbol: string;
  coingecko_id: string;
  price_at_mention: number;
  created_at: string;
  price_after_1h: number | null;
  price_after_24h: number | null;
}

export class InfluencerScorer {
  private timer: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  startProcessing(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.timer = setInterval(() => {
      this.processStaleEvents().catch((error) => {
        console.error('[InfluencerScorer] Error processing stale events:', error);
      });
    }, PROCESS_INTERVAL_MS);

    console.warn('[InfluencerScorer] Started processing loop');
  }

  stopProcessing(): void {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.warn('[InfluencerScorer] Stopped');
  }

  async processStaleEvents(): Promise<void> {
    const supabase = createServiceSupabaseClient();

    // Find events older than 1 hour that are missing 1h price
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: stale1h } = await supabase
      .from('influencer_events')
      .select('id, token_symbol, coingecko_id, price_at_mention, created_at, price_after_1h, price_after_24h')
      .lt('created_at', oneHourAgo)
      .is('price_after_1h', null)
      .limit(50);

    if (stale1h && stale1h.length > 0) {
      await this.updatePricesForEvents(supabase, stale1h as StaleEvent[], 'price_after_1h');
    }

    // Find events older than 24 hours that are missing 24h price
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: stale24h } = await supabase
      .from('influencer_events')
      .select('id, token_symbol, coingecko_id, price_at_mention, created_at, price_after_1h, price_after_24h')
      .lt('created_at', twentyFourHoursAgo)
      .is('price_after_24h', null)
      .not('price_after_1h', 'is', null)
      .limit(50);

    if (stale24h && stale24h.length > 0) {
      await this.updatePricesForEvents(supabase, stale24h as StaleEvent[], 'price_after_24h');
    }

    // Update aggregate scores for accounts with newly completed events
    await this.updateAggregateScores(supabase);
  }

  private async updatePricesForEvents(
    supabase: ReturnType<typeof createServiceSupabaseClient>,
    events: StaleEvent[],
    priceField: 'price_after_1h' | 'price_after_24h'
  ): Promise<void> {
    // Collect unique coingecko IDs
    const uniqueIds = [...new Set(events.map((e) => e.coingecko_id))];
    const prices = await fetchPrices(uniqueIds);

    for (const event of events) {
      const currentPrice = prices[event.coingecko_id];
      if (currentPrice === undefined) {
        continue;
      }

      const { error } = await supabase
        .from('influencer_events')
        .update({ [priceField]: currentPrice })
        .eq('id', event.id);

      if (error) {
        console.error(`[InfluencerScorer] Failed to update ${priceField} for event ${event.id}:`, error);
      }
    }
  }

  private async updateAggregateScores(
    supabase: ReturnType<typeof createServiceSupabaseClient>
  ): Promise<void> {
    // Find accounts with completed events (both 1h and 24h prices filled)
    const { data: completedEvents } = await supabase
      .from('influencer_events')
      .select('account, price_at_mention, price_after_1h, price_after_24h')
      .not('price_after_1h', 'is', null)
      .not('price_after_24h', 'is', null)
      .not('scored', 'is', true)
      .limit(100);

    if (!completedEvents || completedEvents.length === 0) {
      return;
    }

    // Group by account
    const byAccount = new Map<string, typeof completedEvents>();
    for (const event of completedEvents) {
      const account = event.account as string;
      const existing = byAccount.get(account) ?? [];
      existing.push(event);
      byAccount.set(account, existing);
    }

    for (const [account, events] of byAccount) {
      // Calculate accuracy: how many mentions had positive price movement after 24h
      let correctCalls = 0;
      for (const event of events) {
        const priceAtMention = event.price_at_mention as number;
        const priceAfter24h = event.price_after_24h as number;
        // A "correct" call means price went up after mention (bullish bias for now)
        if (priceAfter24h > priceAtMention) {
          correctCalls += 1;
        }
      }

      const accuracy = events.length > 0 ? correctCalls / events.length : 0;

      // Upsert aggregate score
      const { error } = await supabase.from('influencer_scores').upsert(
        {
          account,
          total_calls: events.length,
          correct_calls: correctCalls,
          accuracy,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'account' }
      );

      if (error) {
        console.error(`[InfluencerScorer] Failed to upsert score for ${account}:`, error);
      }

      // Mark events as scored
      const eventIds = events.map((e) => (e as Record<string, unknown>).id);
      if (eventIds.length > 0) {
        await supabase
          .from('influencer_events')
          .update({ scored: true })
          .in('id', eventIds);
      }
    }
  }
}

/**
 * Capture an influencer mention event for reliability scoring.
 * Called from the pipeline after a trigger fires. Detects token symbols,
 * fetches current price, and inserts into influencer_events table.
 */
export async function captureInfluencerEvent(
  account: string,
  tweetText: string,
  tweetId: string
): Promise<void> {
  const tokens = detectTokens(tweetText);
  if (tokens.length === 0) {
    return;
  }

  // Map symbols to CoinGecko IDs, skip unknown tokens
  const tokenPairs: { symbol: string; coingeckoId: string }[] = [];
  for (const symbol of tokens) {
    const coingeckoId = symbolToCoingeckoId(symbol);
    if (coingeckoId) {
      tokenPairs.push({ symbol, coingeckoId });
    }
  }

  if (tokenPairs.length === 0) {
    return;
  }

  // Fetch current prices for all detected tokens
  const coingeckoIds = tokenPairs.map((t) => t.coingeckoId);
  const prices = await fetchPrices(coingeckoIds);

  const supabase = createServiceSupabaseClient();

  // Insert one event per token mentioned
  const inserts = tokenPairs
    .filter((t) => prices[t.coingeckoId] !== undefined)
    .map((t) => ({
      account,
      tweet_id: tweetId,
      token_symbol: t.symbol,
      coingecko_id: t.coingeckoId,
      price_at_mention: prices[t.coingeckoId],
      created_at: new Date().toISOString(),
    }));

  if (inserts.length === 0) {
    return;
  }

  const { error } = await supabase.from('influencer_events').insert(inserts);

  if (error) {
    console.error('[InfluencerScorer] Failed to capture events:', error);
  }
}

export const influencerScorer = new InfluencerScorer();
