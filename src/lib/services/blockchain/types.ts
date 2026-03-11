export interface WalletAlertRow {
  id: string;
  user_id: string;
  address: string;
  label: string | null;
  chain: 'eth' | 'sol';
  min_value_usd: number;
  is_active: boolean;
  created_at: string;
}

export interface WalletTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  valueUsd: number;
  tokenSymbol: string;
  timestamp: number;
}

export interface ChainProvider {
  fetchRecentTransactions(address: string): Promise<WalletTransaction[]>;
}
