export type AlertType = 'social' | 'price';
export type ChannelType = 'telegram' | 'email' | 'discord' | 'sms';

export interface AlertNotification {
  userId: string;
  alertType: AlertType;
  alertId: string;
  message: string;
  data: {
    // Price
    symbol?: string;
    price?: number;
    targetPrice?: number;
    condition?: string;
    // Social
    account?: string;
    keywords?: string[];
    tweet_url?: string;
    tweet_type?: string;
    content?: string;
    sentiment?: string;
    summary?: string;
  };
}

export interface ChannelResult {
  success: boolean;
  error?: string;
}

export interface NotificationResult {
  channels: Record<string, ChannelResult>;
  overallSuccess: boolean;
}
