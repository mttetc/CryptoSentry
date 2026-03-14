// ============================================================
// Crypto provider entry point — change provider HERE only.
// ============================================================
import { binanceProvider } from './binance';
import { BinancePriceStream } from './binance-ws';

export type { CoinSearchResult, CryptoProvider, RealtimePriceStream, PriceCallback } from './types';

// --- Active provider (swap these two lines to change provider) ---
export const cryptoProvider = binanceProvider;
export const createPriceStream = (cb: (prices: Record<string, number>) => void) =>
  new BinancePriceStream(cb);
