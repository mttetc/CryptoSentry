const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const FETCH_TIMEOUT_MS = 10_000;

type CoinPrice = Record<string, { usd: number }>;

export interface CoinSearchResult {
  id: string;
  symbol: string;
  name: string;
  thumb: string;
}

interface CoinSearchResponse {
  coins: CoinSearchResult[];
}

function createTimeoutSignal(): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => {
    controller.abort();
  }, FETCH_TIMEOUT_MS);
  return controller.signal;
}

/**
 * Fetch current USD prices for a list of CoinGecko coin IDs.
 * Returns a flat map: { solana: 150.5, bitcoin: 42000 }
 */
export async function fetchPrices(ids: string[]): Promise<Record<string, number>> {
  if (ids.length === 0) {
    return {};
  }

  try {
    const joined = ids.join(',');
    const url = `${COINGECKO_BASE}/simple/price?ids=${encodeURIComponent(joined)}&vs_currencies=usd`;
    const response = await fetch(url, { signal: createTimeoutSignal() });

    if (!response.ok) {
      console.error(`[CoinGecko] Price fetch failed: ${response.status}`);
      return {};
    }

    const data = (await response.json()) as CoinPrice;
    const result: Record<string, number> = {};

    for (const [id, priceData] of Object.entries(data)) {
      if (priceData?.usd !== undefined) {
        result[id] = priceData.usd;
      }
    }

    return result;
  } catch (error) {
    console.error('[CoinGecko] Price fetch error:', error);
    return {};
  }
}

/**
 * Search CoinGecko for coins matching a query string.
 * Returns top 10 results.
 */
export async function searchCoins(query: string): Promise<CoinSearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    const url = `${COINGECKO_BASE}/search?query=${encodeURIComponent(query)}`;
    const response = await fetch(url, { signal: createTimeoutSignal() });

    if (!response.ok) {
      console.error(`[CoinGecko] Search failed: ${response.status}`);
      return [];
    }

    const data = (await response.json()) as CoinSearchResponse;
    return (data.coins ?? []).slice(0, 10);
  } catch (error) {
    console.error('[CoinGecko] Search error:', error);
    return [];
  }
}
