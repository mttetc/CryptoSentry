import { createServiceSupabaseClient } from '@/lib/supabase/server';
import { cryptoProvider } from '@/lib/services/crypto';
import { detectTokens } from './token-detector';

const PROCESS_INTERVAL_MS = 300_000; // 5 minutes

function symbolToBinancePair(symbol: string): string {
  return `${symbol.toUpperCase()}USDT`;
}

interface StaleEvent {
  id: string;
  token_symbol: string;
  binance_symbol: string;
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
      .select(
        'id, token_symbol, binance_symbol, price_at_mention, created_at, price_after_1h, price_after_24h'
      )
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
      .select(
        'id, token_symbol, binance_symbol, price_at_mention, created_at, price_after_1h, price_after_24h'
      )
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
    const uniqueSymbols = [...new Set(events.map((e) => e.binance_symbol))];
    const prices = await cryptoProvider.fetchPrices(uniqueSymbols);

    for (const event of events) {
      const currentPrice = prices[event.binance_symbol];
      if (currentPrice === undefined) {
        continue;
      }

      const { error } = await supabase
        .from('influencer_events')
        .update({ [priceField]: currentPrice })
        .eq('id', event.id);

      if (error) {
        console.error(
          `[InfluencerScorer] Failed to update ${priceField} for event ${event.id}:`,
          error
        );
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
      let correctCalls = 0;
      for (const event of events) {
        const priceAtMention = event.price_at_mention as number;
        const priceAfter24h = event.price_after_24h as number;
        if (priceAfter24h > priceAtMention) {
          correctCalls += 1;
        }
      }

      const accuracy = events.length > 0 ? correctCalls / events.length : 0;

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

      const eventIds = events.map((e) => (e as Record<string, unknown>).id);
      if (eventIds.length > 0) {
        await supabase.from('influencer_events').update({ scored: true }).in('id', eventIds);
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

  const tokenPairs = tokens.map((symbol) => ({
    symbol,
    binanceSymbol: symbolToBinancePair(symbol),
  }));

  const binanceSymbols = tokenPairs.map((t) => t.binanceSymbol);
  const prices = await cryptoProvider.fetchPrices(binanceSymbols);

  const supabase = createServiceSupabaseClient();

  const inserts = tokenPairs
    .filter((t) => prices[t.binanceSymbol] !== undefined)
    .map((t) => ({
      account,
      tweet_id: tweetId,
      token_symbol: t.symbol,
      binance_symbol: t.binanceSymbol,
      price_at_mention: prices[t.binanceSymbol],
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
