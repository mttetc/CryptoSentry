export interface PriceUpdateEvent {
  type: 'price:update';
  prices: Record<string, number>;
  userIds: string[];
}

export interface PriceTriggeredEvent {
  type: 'price:triggered';
  userId: string;
  alertId: string;
  symbol: string;
  currentPrice: number;
  targetPrice: number;
  direction: 'above' | 'below';
}

export interface WhaleTriggeredEvent {
  type: 'whale:triggered';
  userId: string;
  alertId: string;
  txHash: string;
  tokenSymbol: string;
  valueUsd: number;
  chain: string;
  from: string;
  to: string;
}

export type AlertStreamEvent =
  | PriceUpdateEvent
  | PriceTriggeredEvent
  | WhaleTriggeredEvent;
