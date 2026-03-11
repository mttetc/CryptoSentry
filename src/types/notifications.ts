export type AlertType = 'social' | 'price' | 'whale' | 'composite';
export type ChannelType = 'telegram' | 'email' | 'discord' | 'sms';

export interface AlertNotification {
  userId: string;
  alertType: AlertType;
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
    sentiment?: string;
    summary?: string;
    // Whale data
    tx_hash?: string;
    from_address?: string;
    to_address?: string;
    value_usd?: number;
    token_symbol?: string;
    chain?: string;
    // Portfolio impact
    portfolio_impact?: {
      position_amount: number;
      cost_basis: number;
      current_value: number;
      impact_usd: number;
      impact_percent: number;
    };
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
