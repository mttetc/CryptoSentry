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
  telegram_conversation_id: string | null;
  call_enabled: boolean;
  created_at: string;
  tweetCount: number;
  lastActivity: string;
  recentTweets: AlertTweet[];
}
