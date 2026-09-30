/**
 * Official X API v2 filtered stream (pay-per-use). https://docs.x.com/x-api/posts/filtered-stream
 *
 * Cost lock-down, on purpose:
 *   - tweet.fields limited to created_at + referenced_tweets, NO expansions (a user expansion is a
 *     separately billed user read). The author handle comes from the matching rule tag.
 *   - rules exclude retweets, and replies/quotes unless a Premium alert opted in.
 *   - a global monthly cap on delivered posts (X_STREAM_MONTHLY_POST_CAP) stops the stream.
 *   - a cap on the number of rules (X_STREAM_MAX_RULES, X allows 1000 on pay-per-use).
 */

import { createServiceSupabaseClient } from '@/lib/supabase/server';
import {
  accountFromTag,
  buildStreamRules,
  diffRules,
  utcMonthKey,
  X_DEFAULT_MAX_RULES,
  type StreamRule,
} from '../matching';
import type { SocialAlertRow, TweetCallback, TweetData, TweetProvider, TweetType } from '../types';

const API_BASE = 'https://api.x.com/2';
const STREAM_FIELDS = 'tweet.fields=created_at,referenced_tweets';

const USAGE_FLUSH_EVERY = 20; // Posts
const USAGE_FLUSH_INTERVAL_MS = 30_000;
const CAP_RECHECK_INTERVAL_MS = 60 * 60 * 1000;

// Reconnect backoff per X guidance
const NETWORK_BACKOFF_STEP_MS = 250;
const NETWORK_BACKOFF_MAX_MS = 16_000;
const HTTP_BACKOFF_START_MS = 5000;
const RATE_LIMIT_BACKOFF_START_MS = 60_000;
const HTTP_BACKOFF_MAX_MS = 320_000;

interface RemoteRule {
  id: string;
  value: string;
  tag?: string;
}

interface StreamPayload {
  data?: {
    id: string;
    text: string;
    created_at?: string;
    referenced_tweets?: { type: 'replied_to' | 'retweeted' | 'quoted'; id: string }[];
  };
  matching_rules?: { id: string; tag?: string }[];
  errors?: { title?: string; detail?: string; disconnect_type?: string }[];
}

export interface XFilteredStreamConfig {
  bearerToken: string;
  monthlyPostCap: number;
  maxRules: number;
}

export function readXStreamConfig(): XFilteredStreamConfig | null {
  const bearerToken = process.env.X_BEARER_TOKEN;
  if (!bearerToken) {
    return null;
  }
  return {
    bearerToken,
    monthlyPostCap: Number(process.env.X_STREAM_MONTHLY_POST_CAP ?? 20_000) || 20_000,
    maxRules: Math.min(
      1000,
      Number(process.env.X_STREAM_MAX_RULES ?? X_DEFAULT_MAX_RULES) || X_DEFAULT_MAX_RULES
    ),
  };
}

// --- Pure helpers ---

export function tweetTypeFromPayload(data: NonNullable<StreamPayload['data']>): TweetType {
  const refs = data.referenced_tweets ?? [];
  if (refs.some((r) => r.type === 'retweeted')) {
    return 'retweet';
  }
  if (refs.some((r) => r.type === 'replied_to')) {
    return 'reply';
  }
  if (refs.some((r) => r.type === 'quoted')) {
    return 'quote';
  }
  return 'original';
}

export function normalizeStreamPayload(payload: StreamPayload): TweetData | null {
  const data = payload.data;
  const tag = payload.matching_rules?.[0]?.tag;
  if (!data?.id || !data.text || !tag) {
    return null;
  }
  const account = accountFromTag(tag);
  return {
    id: data.id,
    text: data.text,
    type: tweetTypeFromPayload(data),
    author: { userName: account },
    createdAt: data.created_at ?? new Date().toISOString(),
    url: `https://x.com/${account}/status/${data.id}`,
  };
}

// --- Provider ---

export class XFilteredStreamProvider implements TweetProvider {
  readonly name = 'x-filtered-stream';

  private onTweets: TweetCallback | null = null;
  private running = false;
  private abort: AbortController | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private networkBackoffMs = 0;
  private httpBackoffMs = 0;

  private ruleCount = 0;
  private droppedRules = 0;

  private usageMonth = utcMonthKey();
  private usageThisMonth = 0;
  private pendingUsage = 0;
  private usageFlushTimer: ReturnType<typeof setInterval> | null = null;
  private capped = false;
  private lastError: string | null = null;
  private connectedSince: string | null = null;

  private readonly config: XFilteredStreamConfig;

  constructor(config: XFilteredStreamConfig) {
    this.config = config;
  }

  getStatus(): Record<string, unknown> {
    return {
      provider: this.name,
      running: this.running,
      connected: this.connectedSince !== null,
      connectedSince: this.connectedSince,
      capped: this.capped,
      month: this.usageMonth,
      deliveredThisMonth: this.usageThisMonth + this.pendingUsage,
      monthlyPostCap: this.config.monthlyPostCap,
      rules: this.ruleCount,
      droppedRules: this.droppedRules,
      lastError: this.lastError,
    };
  }

  // --- lifecycle ---

  async start(onTweets: TweetCallback): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    this.onTweets = onTweets;

    await this.loadUsage();
    this.usageFlushTimer = setInterval(() => {
      // Flush the old month's pending count BEFORE rolling the month over.
      this.flushUsage()
        .catch(console.error)
        .finally(() => this.rolloverMonthIfNeeded());
    }, USAGE_FLUSH_INTERVAL_MS);

    this.connectLoop().catch((error) => {
      console.error('[XStream] Fatal in connect loop:', error);
    });
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.usageFlushTimer) {
      clearInterval(this.usageFlushTimer);
      this.usageFlushTimer = null;
    }
    this.abort?.abort();
    this.abort = null;
    await this.flushUsage();
    console.warn('[XStream] Stopped');
  }

  // --- rules ---

  async syncAlerts(alerts: SocialAlertRow[]): Promise<void> {
    let desired: StreamRule[] = buildStreamRules(alerts);

    if (desired.length > this.config.maxRules) {
      this.droppedRules = desired.length - this.config.maxRules;
      console.error(
        `[XStream] ${desired.length} rules needed but cap is ${this.config.maxRules}; dropping ${this.droppedRules}`
      );
      desired = desired.slice(0, this.config.maxRules);
    } else {
      this.droppedRules = 0;
    }

    const remote = await this.fetchRules();
    const { toAdd, toDeleteIds } = diffRules(desired, remote);

    let rejected = 0;
    if (toDeleteIds.length > 0) {
      rejected += await this.postRules({ delete: { ids: toDeleteIds } });
    }
    if (toAdd.length > 0) {
      // X accepts batches; keep them small to get readable error payloads.
      for (let i = 0; i < toAdd.length; i += 50) {
        rejected += await this.postRules({ add: toAdd.slice(i, i + 50) });
      }
    }

    // Trust X, not our intent: rules it rejected must not be counted as active.
    const active = toAdd.length > 0 || toDeleteIds.length > 0 ? await this.fetchRules() : remote;
    const desiredValues = new Set(desired.map((r) => r.value));
    this.ruleCount = active.filter((r) => desiredValues.has(r.value)).length;
    const missing = desired.length - this.ruleCount;
    if (missing > 0) {
      this.droppedRules += missing;
      this.lastError = `${missing} rule(s) rejected by X`;
      console.error(`[XStream] ${missing} rule(s) rejected by X (${rejected} error entries)`);
    }

    if (toAdd.length > 0 || toDeleteIds.length > 0) {
      console.warn(
        `[XStream] Rules synced: ${this.ruleCount} active (+${toAdd.length} / -${toDeleteIds.length})`
      );
    }
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.bearerToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async fetchRules(): Promise<RemoteRule[]> {
    const res = await fetch(`${API_BASE}/tweets/search/stream/rules`, { headers: this.headers() });
    if (!res.ok) {
      throw new Error(`[XStream] GET rules failed: ${res.status} ${await res.text()}`);
    }
    const json = (await res.json()) as { data?: RemoteRule[] };
    return json.data ?? [];
  }

  /** Returns the number of error entries X reported for this batch. */
  private async postRules(body: Record<string, unknown>): Promise<number> {
    const res = await fetch(`${API_BASE}/tweets/search/stream/rules`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`[XStream] POST rules failed: ${res.status} ${await res.text()}`);
    }
    const json = (await res.json()) as { errors?: unknown[] };
    if (json.errors && json.errors.length > 0) {
      console.error('[XStream] Rule errors:', JSON.stringify(json.errors));
      return json.errors.length;
    }
    return 0;
  }

  // --- usage cap ---

  private async loadUsage(): Promise<void> {
    const supabase = createServiceSupabaseClient();
    const { data } = await supabase
      .from('x_stream_usage')
      .select('delivered')
      .eq('month', this.usageMonth)
      .maybeSingle();
    this.usageThisMonth = data?.delivered ?? 0;
    this.capped = this.usageThisMonth >= this.config.monthlyPostCap;
    if (this.capped) {
      console.error(
        `[XStream] Monthly cap already reached (${this.usageThisMonth}/${this.config.monthlyPostCap}); not connecting`
      );
    }
  }

  private recordDelivered(count: number): void {
    this.pendingUsage += count;
    if (this.pendingUsage >= USAGE_FLUSH_EVERY) {
      this.flushUsage().catch(console.error);
    }
    if (this.usageThisMonth + this.pendingUsage >= this.config.monthlyPostCap && !this.capped) {
      this.capped = true;
      this.lastError = 'monthly post cap reached';
      console.error(
        `[XStream] Monthly post cap reached (${this.config.monthlyPostCap}). Disconnecting until next UTC month.`
      );
      this.abort?.abort();
    }
  }

  private async flushUsage(): Promise<void> {
    if (this.pendingUsage === 0) {
      return;
    }
    const count = this.pendingUsage;
    const month = this.usageMonth;
    this.pendingUsage = 0;
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.rpc('increment_x_stream_usage', {
      p_month: month,
      p_count: count,
    });
    if (month !== this.usageMonth) {
      // The month rolled over while this flush was in flight: the result belongs to the old month.
      return;
    }
    if (error) {
      console.error('[XStream] Failed to persist usage:', error);
      this.pendingUsage += count; // Retry later
      return;
    }
    if (typeof data === 'number') {
      this.usageThisMonth = data;
    } else {
      this.usageThisMonth += count;
    }
  }

  private rolloverMonthIfNeeded(): void {
    const month = utcMonthKey();
    if (month === this.usageMonth) {
      return;
    }
    this.usageMonth = month;
    this.usageThisMonth = 0;
    this.pendingUsage = 0;
    if (this.capped) {
      this.capped = false;
      this.lastError = null;
      console.warn('[XStream] New UTC month, cap released; reconnecting');
      this.scheduleReconnect(0);
    }
  }

  // --- streaming ---

  private scheduleReconnect(delayMs: number): void {
    if (!this.running || this.reconnectTimer) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectLoop().catch((error) => {
        console.error('[XStream] Fatal in connect loop:', error);
      });
    }, delayMs);
  }

  private async connectLoop(): Promise<void> {
    if (!this.running) {
      return;
    }
    if (this.capped) {
      this.scheduleReconnect(CAP_RECHECK_INTERVAL_MS);
      return;
    }
    if (this.ruleCount === 0) {
      // Nothing to watch: no connection, no cost. Monitor re-syncs rules periodically.
      this.scheduleReconnect(60_000);
      return;
    }

    this.abort = new AbortController();
    const url = `${API_BASE}/tweets/search/stream?${STREAM_FIELDS}`;

    let response: Response;
    try {
      response = await fetch(url, { headers: this.headers(), signal: this.abort.signal });
    } catch (error) {
      if (!this.running || this.capped) {
        return;
      }
      this.lastError = error instanceof Error ? error.message : 'network error';
      this.networkBackoffMs = Math.min(
        this.networkBackoffMs + NETWORK_BACKOFF_STEP_MS,
        NETWORK_BACKOFF_MAX_MS
      );
      console.error(
        `[XStream] Connect error, retry in ${this.networkBackoffMs}ms:`,
        this.lastError
      );
      this.scheduleReconnect(this.networkBackoffMs);
      return;
    }

    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => '');
      this.lastError = `HTTP ${response.status} ${text.slice(0, 200)}`;
      const start = response.status === 429 ? RATE_LIMIT_BACKOFF_START_MS : HTTP_BACKOFF_START_MS;
      this.httpBackoffMs = Math.min(
        this.httpBackoffMs === 0 ? start : this.httpBackoffMs * 2,
        HTTP_BACKOFF_MAX_MS
      );
      console.error(`[XStream] ${this.lastError}; retry in ${this.httpBackoffMs}ms`);
      this.scheduleReconnect(this.httpBackoffMs);
      return;
    }

    this.networkBackoffMs = 0;
    this.httpBackoffMs = 0;
    this.connectedSince = new Date().toISOString();
    this.lastError = null;
    console.warn(`[XStream] Connected (${this.ruleCount} rules)`);

    try {
      await this.consume(response.body);
    } catch (error) {
      if (this.running && !this.capped) {
        this.lastError = error instanceof Error ? error.message : 'stream error';
        console.error('[XStream] Stream error:', this.lastError);
      }
    } finally {
      this.connectedSince = null;
    }

    if (this.running) {
      // X closes idle connections and asks clients to reconnect; small delay avoids hammering.
      this.scheduleReconnect(this.capped ? CAP_RECHECK_INTERVAL_MS : 1000);
    }
  }

  private async consume(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (this.running && !this.capped) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      let newline = buffer.indexOf('\r\n');
      while (newline !== -1) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 2);
        if (line) {
          await this.handleLine(line);
        }
        newline = buffer.indexOf('\r\n');
      }
    }

    reader.cancel().catch(() => null);
  }

  private async handleLine(line: string): Promise<void> {
    let payload: StreamPayload;
    try {
      payload = JSON.parse(line) as StreamPayload;
    } catch {
      return; // Keep-alive noise
    }

    if (payload.errors?.length) {
      const first = payload.errors[0];
      this.lastError = `${first.title ?? 'error'}: ${first.detail ?? ''}`.trim();
      console.error('[XStream] Server error payload:', this.lastError);
      if (first.disconnect_type) {
        this.abort?.abort();
      }
      return;
    }

    if (!payload.data) {
      return;
    }

    // Every delivered post is billed, whatever we do with it afterwards.
    this.recordDelivered(1);

    const tweet = normalizeStreamPayload(payload);
    if (!tweet || !this.onTweets) {
      return;
    }

    try {
      await this.onTweets([tweet]);
    } catch (error) {
      console.error('[XStream] onTweets failed:', error);
    }
  }
}
