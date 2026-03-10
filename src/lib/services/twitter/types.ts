// Strategy Pattern interfaces for tweet providers

export interface TweetData {
  id: string;
  text: string;
  author: { userName: string; displayName: string };
  createdAt: string;
  url: string;
  engagement?: { likes: number; retweets: number; replies: number };
}

// DB row from social_alerts table — includes 'account' not in SocialAlert
export interface SocialAlertRow {
  id: string;
  user_id: string;
  platform: string;
  account: string;
  keywords: string[];
  is_active?: boolean;
  sentiment_filter?: string | null;
  call_enabled?: boolean;
}

export interface AnalyzedMatch {
  alert: SocialAlertRow;
  tweet: TweetData;
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
}

export type TweetCallback = (tweets: TweetData[]) => void;

export interface TweetProviderConfig {
  usernames: string[];
  keywords: string[];
}

export interface TweetProvider {
  start(config: TweetProviderConfig): Promise<void>;
  stop(): Promise<void>;
  onTweets(callback: TweetCallback): void;
}
