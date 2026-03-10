import { createServiceSupabaseClient } from '@/lib/supabase/server';
import { sendUnifiedAlert } from '@/actions/messaging/unified-notifications';

// --- Types ---

interface ConditionalRuleRow {
  id: string;
  user_id: string;
  name: string;
  rule_type: 'multi_influencer' | 'volume_spike' | 'sentiment_shift';
  config: Record<string, unknown>;
  time_window_minutes: number;
  is_active: boolean;
}

interface TriggerRow {
  data: Record<string, unknown>;
  triggered_at: string;
}

// --- Pure functions ---

function countDistinctAuthors(
  triggers: TriggerRow[],
  tokenFilter?: string[]
): Map<string, Set<string>> {
  const tokenAuthors = new Map<string, Set<string>>();

  for (const trigger of triggers) {
    const content = String(trigger.data?.content ?? '').toLowerCase();
    const author = String(trigger.data?.author ?? '');

    if (!author) {
      continue;
    }

    // Extract mentioned token symbols (simple $SYMBOL pattern)
    const symbolMatches = content.match(/\$[a-z]+/gi) ?? [];
    const symbols = symbolMatches.map((s) => s.slice(1).toUpperCase());

    for (const symbol of symbols) {
      if (tokenFilter && tokenFilter.length > 0) {
        const upperFilter = tokenFilter.map((t) => t.toUpperCase());
        if (!upperFilter.includes(symbol)) {
          continue;
        }
      }

      const authors = tokenAuthors.get(symbol) ?? new Set<string>();
      authors.add(author);
      tokenAuthors.set(symbol, authors);
    }
  }

  return tokenAuthors;
}

function computeVolumeRatio(
  currentCount: number,
  historicalCount: number,
  historicalDays: number
): number {
  const avgDaily = historicalDays > 0 ? historicalCount / historicalDays : 0;
  return avgDaily > 0 ? currentCount / avgDaily : 0;
}

function computeSentimentRatio(triggers: TriggerRow[], direction: string): number {
  let positive = 0;
  let negative = 0;

  for (const trigger of triggers) {
    const sentiment = String(trigger.data?.sentiment ?? '').toLowerCase();
    if (sentiment === 'positive') {
      positive++;
    } else if (sentiment === 'negative') {
      negative++;
    }
  }

  const total = positive + negative;
  if (total === 0) {
    return 0;
  }

  if (direction === 'negative') {
    return negative / total;
  }
  return positive / total;
}

// --- I/O helpers ---

async function fetchActiveRules(): Promise<ConditionalRuleRow[]> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('conditional_rules')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('[ConditionalScanner] Error fetching rules:', error);
    return [];
  }

  return (data as ConditionalRuleRow[]) ?? [];
}

async function fetchTriggersInWindow(
  timeWindowMinutes: number,
  symbol?: string
): Promise<TriggerRow[]> {
  const supabase = createServiceSupabaseClient();
  const cutoff = new Date(Date.now() - timeWindowMinutes * 60 * 1000).toISOString();

  let query = supabase
    .from('alert_triggers')
    .select('data, triggered_at')
    .gte('triggered_at', cutoff);

  if (symbol) {
    // Filter by symbol in the data JSON column
    query = query.contains('data', { symbol });
  }

  const { data, error } = await query;

  if (error) {
    console.error('[ConditionalScanner] Error fetching triggers:', error);
    return [];
  }

  return (data as TriggerRow[]) ?? [];
}

async function fetchHistoricalTriggerCount(
  symbol: string,
  timeWindowMinutes: number,
  days: number
): Promise<number> {
  const supabase = createServiceSupabaseClient();
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const end = new Date(Date.now() - timeWindowMinutes * 60 * 1000).toISOString();

  const { count } = await supabase
    .from('alert_triggers')
    .select('*', { count: 'exact', head: true })
    .contains('data', { symbol })
    .gte('triggered_at', start)
    .lte('triggered_at', end);

  return count ?? 0;
}

// --- Scanner class ---

class ConditionalScanner {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  start(intervalMs = 60_000): void {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.scan().catch((error) => {
        console.error('[ConditionalScanner] Scan error:', error);
      });
    }, intervalMs);

    console.info('[ConditionalScanner] Started with interval:', intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.info('[ConditionalScanner] Stopped');
    }
  }

  async scan(): Promise<void> {
    const rules = await fetchActiveRules();

    for (const rule of rules) {
      try {
        await this.evaluateRule(rule);
      } catch (error) {
        console.error(`[ConditionalScanner] Error evaluating rule ${rule.id}:`, error);
      }
    }
  }

  private async evaluateRule(rule: ConditionalRuleRow): Promise<void> {
    switch (rule.rule_type) {
      case 'multi_influencer': {
        await this.evaluateMultiInfluencer(rule);
        break;
      }
      case 'volume_spike': {
        await this.evaluateVolumeSpike(rule);
        break;
      }
      case 'sentiment_shift': {
        await this.evaluateSentimentShift(rule);
        break;
      }
    }
  }

  private async evaluateMultiInfluencer(rule: ConditionalRuleRow): Promise<void> {
    const minInfluencers = Number(rule.config.minInfluencers ?? 3);
    const tokenFilter = rule.config.tokenFilter as string[] | undefined;

    const triggers = await fetchTriggersInWindow(rule.time_window_minutes);
    const tokenAuthors = countDistinctAuthors(triggers, tokenFilter);

    for (const [token, authors] of tokenAuthors) {
      if (authors.size >= minInfluencers) {
        await sendUnifiedAlert({
          userId: rule.user_id,
          alertType: 'social',
          alertId: rule.id,
          message: `Multiple influencer alert: ${authors.size} influencers mentioned $${token} in the last ${rule.time_window_minutes} minutes.`,
          data: {
            symbol: token,
            summary: `${authors.size} distinct influencers mentioned $${token}`,
          },
        });
      }
    }
  }

  private async evaluateVolumeSpike(rule: ConditionalRuleRow): Promise<void> {
    const symbol = String(rule.config.symbol ?? '');
    const multiplier = Number(rule.config.multiplier ?? 3);

    if (!symbol) {
      return;
    }

    const triggers = await fetchTriggersInWindow(rule.time_window_minutes, symbol);
    const currentCount = triggers.length;

    const historicalCount = await fetchHistoricalTriggerCount(symbol, rule.time_window_minutes, 7);

    const ratio = computeVolumeRatio(currentCount, historicalCount, 7);

    if (ratio >= multiplier) {
      await sendUnifiedAlert({
        userId: rule.user_id,
        alertType: 'social',
        alertId: rule.id,
        message: `Volume spike alert: ${symbol} mentions are ${ratio.toFixed(1)}x above average.`,
        data: {
          symbol,
          summary: `${currentCount} mentions in the last ${rule.time_window_minutes} min (${ratio.toFixed(1)}x normal)`,
        },
      });
    }
  }

  private async evaluateSentimentShift(rule: ConditionalRuleRow): Promise<void> {
    const symbol = String(rule.config.symbol ?? '');
    const direction = String(rule.config.direction ?? 'negative');
    const threshold = Number(rule.config.threshold ?? 0.7);

    if (!symbol) {
      return;
    }

    const triggers = await fetchTriggersInWindow(rule.time_window_minutes, symbol);

    const ratio = computeSentimentRatio(triggers, direction);

    if (ratio >= threshold) {
      await sendUnifiedAlert({
        userId: rule.user_id,
        alertType: 'social',
        alertId: rule.id,
        message: `Sentiment shift alert: ${symbol} sentiment is ${(ratio * 100).toFixed(0)}% ${direction}.`,
        data: {
          symbol,
          sentiment: direction,
          summary: `${(ratio * 100).toFixed(0)}% ${direction} sentiment for ${symbol}`,
        },
      });
    }
  }
}

export const conditionalScanner = new ConditionalScanner();
