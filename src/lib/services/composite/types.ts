export interface SocialCondition {
  type: 'social';
  account: string;
  keywords: string[];
}

export interface PriceCondition {
  type: 'price';
  symbol: string;
  direction: 'above' | 'below';
  targetPrice: number;
}

export interface WhaleCondition {
  type: 'whale';
  chain: 'eth' | 'sol';
  minValueUsd: number;
}

export type CompositeCondition = SocialCondition | PriceCondition | WhaleCondition;

export interface CompositeAlertRow {
  id: string;
  user_id: string;
  name: string;
  conditions: CompositeCondition[];
  time_window_minutes: number;
  is_active: boolean;
  last_evaluated_at: string | null;
  created_at: string;
}

export interface ConditionEvent {
  id: string;
  composite_alert_id: string;
  condition_index: number;
  trigger_data: Record<string, unknown>;
  occurred_at: string;
}
