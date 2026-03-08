export interface AlertNotification {
  userId: string;
  alertType: 'price' | 'social';
  alertId?: string;
  message: string;
  data: {
    symbol?: string;
    price?: number;
    account?: string;
    keywords?: string[];
    tweet_url?: string;
    content?: string;
    condition?: string;
    targetPrice?: number;
  };
}

export interface NotificationResult {
  telegram: {
    success: boolean;
    error?: string;
  };
  overallSuccess: boolean;
}
