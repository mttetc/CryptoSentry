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
  sentiment?: string | null;
  summary?: string | null;
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
  binance_symbol: string;
  logo: string;
  target_price: number;
  direction: 'above' | 'below' | 'exact';
  is_active: boolean;
  recurring: boolean;
  triggered_at: string | null;
  last_triggered_at: string | null;
  created_at: string;
}
