export interface AlertNotification {
  userId: string;
  alertType: 'price' | 'social';
  message: string;
  data: {
    symbol?: string;
    price?: number;
    account?: string;
    keywords?: string[];
    tweet_url?: string;
  };
}
