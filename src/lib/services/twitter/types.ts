export type TweetType = 'original' | 'reply' | 'retweet' | 'quote';

/** The only tweet data we keep: id, text, type, author handle, timestamp. */
export interface TweetData {
  id: string;
  text: string;
  type: TweetType;
  author: { userName: string };
  createdAt: string;
  url: string;
}

// DB row from social_alerts table
export interface SocialAlertRow {
  id: string;
  user_id: string;
  platform: string;
  account: string;
  keywords: string[];
  is_active?: boolean;
  sentiment_filter?: string | null;
  call_enabled?: boolean;
  include_replies?: boolean;
}

export interface AnalyzedMatch {
  alert: SocialAlertRow;
  tweet: TweetData;
  matchedKeywords: string[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  summary: string;
}

export interface ProcessingResult {
  processed: number;
  matched: number;
  triggered: number;
  matches?: AnalyzedMatch[];
}

export interface PipelineDeps {
  alerts: SocialAlertRow[];
  onTrigger?: (alert: SocialAlertRow, tweet: TweetData) => Promise<void>;
  /** Skip the persisted dedup table (tests / dev ingest). */
  skipPersistence?: boolean;
}

export type TweetCallback = (tweets: TweetData[]) => Promise<unknown>;

/** A push-based tweet source. Rules are derived from the active alerts. */
export interface TweetProvider {
  readonly name: string;
  start(onTweets: TweetCallback): Promise<void>;
  stop(): Promise<void>;
  /** Re-sync the provider's server-side filters with the given alerts. */
  syncAlerts(alerts: SocialAlertRow[]): Promise<void>;
  getStatus(): Record<string, unknown>;
}
