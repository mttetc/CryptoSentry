export interface CoinSearchResult {
  id: string;
  symbol: string;
  name: string;
  logo?: string;
}

export interface CryptoProvider {
  searchCoins(query: string): Promise<CoinSearchResult[]>;
  fetchPrices(ids: string[]): Promise<Record<string, number>>;
}

export type PriceCallback = (prices: Record<string, number>) => void;

export interface RealtimePriceStream {
  subscribe(ids: string[]): void;
  close(): void;
  revive(): void;
}
