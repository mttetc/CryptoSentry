import type { ChainProvider, WalletTransaction } from '../types';
import { fetchPrices } from '@/lib/services/crypto/coingecko';

const SOLSCAN_BASE = 'https://pro-api.solscan.io/v2.0';
const FETCH_TIMEOUT_MS = 10_000;

interface SolscanTransfer {
  trans_id: string;
  from_address: string;
  to_address: string;
  amount: number;
  token_symbol: string;
  token_decimals: number;
  block_time: number;
}

interface SolscanResponse {
  success: boolean;
  data: SolscanTransfer[];
}

function createTimeoutSignal(): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => {
    controller.abort();
  }, FETCH_TIMEOUT_MS);
  return controller.signal;
}

async function fetchSolPrice(): Promise<number> {
  const prices = await fetchPrices(['solana']);
  return prices.solana ?? 0;
}

export class SolscanProvider implements ChainProvider {
  async fetchRecentTransactions(address: string): Promise<WalletTransaction[]> {
    const apiKey = process.env.SOLSCAN_API_KEY;
    if (!apiKey) {
      console.error('[Solscan] Missing SOLSCAN_API_KEY');
      return [];
    }

    const url = `${SOLSCAN_BASE}/account/transfer?address=${encodeURIComponent(address)}&page_size=20`;

    try {
      const [response, solPrice] = await Promise.all([
        fetch(url, {
          headers: { token: apiKey },
          signal: createTimeoutSignal(),
        }),
        fetchSolPrice(),
      ]);

      if (!response.ok) {
        console.error(`[Solscan] Transfer fetch failed: ${response.status}`);
        return [];
      }

      const data = (await response.json()) as SolscanResponse;
      if (!data.success || !Array.isArray(data.data)) {
        return [];
      }

      return data.data.map((transfer) => {
        const isSol = transfer.token_symbol === 'SOL';
        const decimalValue = transfer.amount / 10 ** transfer.token_decimals;

        return {
          hash: transfer.trans_id,
          from: transfer.from_address,
          to: transfer.to_address,
          value: decimalValue.toFixed(6),
          valueUsd: isSol ? decimalValue * solPrice : 0,
          tokenSymbol: transfer.token_symbol,
          timestamp: transfer.block_time,
        };
      });
    } catch (error) {
      console.error('[Solscan] Transfer fetch error:', error);
      return [];
    }
  }
}
