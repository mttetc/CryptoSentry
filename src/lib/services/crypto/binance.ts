import type { CryptoProvider, CoinSearchResult } from './types';

interface ExchangeInfoSymbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
}

interface ExchangeInfoResponse {
  symbols: ExchangeInfoSymbol[];
}

interface BinanceAsset {
  assetCode: string;
  assetName: string;
  logoUrl: string;
  delisted: boolean;
}

interface AssetResponse {
  data: BinanceAsset[];
}

interface TickerPrice {
  symbol: string;
  price: string;
}

const BINANCE_BASE = 'https://api.binance.com';
const BINANCE_BAPI = 'https://www.binance.com/bapi/asset/v2/public/asset/asset/get-all-asset';
const CACHE_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

// Exchange info cache (USDT trading pairs)
let cachedPairs: ExchangeInfoSymbol[] = [];
let pairsCacheTime = 0;

// Asset metadata cache (names + logos)
let assetNames = new Map<string, { name: string; logo: string }>();
let assetsCacheTime = 0;

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function getUsdtPairs(): Promise<ExchangeInfoSymbol[]> {
  const now = Date.now();
  if (cachedPairs.length > 0 && now - pairsCacheTime < CACHE_TTL_MS) {
    return cachedPairs;
  }

  try {
    const res = await fetchWithTimeout(`${BINANCE_BASE}/api/v3/exchangeInfo`);
    if (!res.ok) {
      return cachedPairs;
    }

    const data = (await res.json()) as ExchangeInfoResponse;
    cachedPairs = data.symbols.filter((s) => s.quoteAsset === 'USDT' && s.status === 'TRADING');
    pairsCacheTime = now;
  } catch {
    // Return stale cache on failure
  }

  return cachedPairs;
}

async function getAssetMetadata(): Promise<Map<string, { name: string; logo: string }>> {
  const now = Date.now();
  if (assetNames.size > 0 && now - assetsCacheTime < CACHE_TTL_MS) {
    return assetNames;
  }

  try {
    const res = await fetchWithTimeout(BINANCE_BAPI);
    if (!res.ok) {
      return assetNames;
    }

    const data = (await res.json()) as AssetResponse;
    const fresh = new Map<string, { name: string; logo: string }>();
    for (const asset of data.data ?? []) {
      if (!asset.delisted) {
        fresh.set(asset.assetCode, { name: asset.assetName, logo: asset.logoUrl });
      }
    }
    assetNames = fresh;
    assetsCacheTime = now;
  } catch {
    // Return stale cache on failure
  }

  return assetNames;
}

async function searchCoins(query: string): Promise<CoinSearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    const [pairs, metadata] = await Promise.all([getUsdtPairs(), getAssetMetadata()]);
    const q = query.toUpperCase();

    const matches = pairs
      .filter((p) => {
        const meta = metadata.get(p.baseAsset);
        const name = meta?.name?.toUpperCase() ?? '';
        return p.baseAsset.includes(q) || p.symbol.includes(q) || name.includes(q);
      })
      .slice(0, 10)
      .map((p) => {
        const meta = metadata.get(p.baseAsset);
        return {
          id: p.symbol,
          symbol: p.baseAsset,
          name: meta?.name ?? p.baseAsset,
          logo: meta?.logo ?? '',
        };
      });

    return matches;
  } catch {
    return [];
  }
}

async function fetchPrices(binanceSymbols: string[]): Promise<Record<string, number>> {
  if (binanceSymbols.length === 0) {
    return {};
  }

  try {
    const symbols = JSON.stringify(binanceSymbols);
    const url = `${BINANCE_BASE}/api/v3/ticker/price?symbols=${encodeURIComponent(symbols)}`;
    const res = await fetchWithTimeout(url);

    if (!res.ok) {
      return {};
    }

    const data = (await res.json()) as TickerPrice[];
    const result: Record<string, number> = {};

    for (const ticker of data) {
      result[ticker.symbol] = Number.parseFloat(ticker.price);
    }

    return result;
  } catch {
    return {};
  }
}

export const binanceProvider: CryptoProvider = { searchCoins, fetchPrices };
