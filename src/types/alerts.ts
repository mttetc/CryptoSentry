export interface BaseAlert {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  active: boolean;
}

export interface PriceAlert extends BaseAlert {
  symbol: string;
  target_price: number;
  direction: 'above' | 'below';
  triggered_at?: string;
}

export interface SocialAlert extends BaseAlert {
  platform: 'twitter' | 'reddit' | 'discord';
  keywords: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  triggered_at?: string;
}

export interface AlertTweet {
  id: string;
  text: string;
  author: string;
  url: string;
  timestamp: string;
  engagement: {
    likes: number;
    retweets: number;
    replies: number;
  };
}

export interface SocialAlertWithStats {
  id: string;
  user_id: string;
  platform: string;
  account: string;
  keywords: string[];
  is_active: boolean;
  call_enabled: boolean;
  created_at: string;
  tweetCount: number;
  lastActivity: string;
  recentTweets: AlertTweet[];
  sentiment_filter?: string | null;
}

export interface PriceAlertWithStats {
  id: string;
  user_id: string;
  symbol: string;
  coingecko_id: string;
  target_price: number;
  direction: 'above' | 'below' | 'exact';
  is_active: boolean;
  recurring: boolean;
  triggered_at: string | null;
  last_triggered_at: string | null;
  created_at: string;
}

export interface WalletAlertWithStats {
  id: string;
  user_id: string;
  address: string;
  label: string | null;
  chain: 'eth' | 'sol';
  min_value_usd: number;
  is_active: boolean;
  created_at: string;
  triggerCount: number;
  lastActivity: string;
}
