import type { ChainProvider, WalletTransaction } from '../types';
import { fetchPrices } from '@/lib/services/crypto/coingecko';

const ETHERSCAN_BASE = 'https://api.etherscan.io/api';
const FETCH_TIMEOUT_MS = 10_000;

// Etherscan API response types
interface EtherscanTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
}

interface EtherscanTokenTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenSymbol: string;
  tokenDecimal: string;
  timeStamp: string;
}

interface EtherscanResponse<T> {
  status: string;
  result: T[];
}

function createTimeoutSignal(): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => {
    controller.abort();
  }, FETCH_TIMEOUT_MS);
  return controller.signal;
}

function weiToEth(wei: string): number {
  // Convert wei string to ETH (1 ETH = 1e18 wei)
  const weiNum = Number(wei);
  if (Number.isNaN(weiNum)) {
    return 0;
  }
  return weiNum / 1e18;
}

function tokenToDecimal(value: string, decimals: string): number {
  const num = Number(value);
  const dec = Number(decimals);
  if (Number.isNaN(num) || Number.isNaN(dec)) {
    return 0;
  }
  return num / 10 ** dec;
}

async function fetchEthPrice(): Promise<number> {
  const prices = await fetchPrices(['ethereum']);
  return prices.ethereum ?? 0;
}

async function fetchEthTransactions(
  address: string,
  apiKey: string
): Promise<EtherscanTx[]> {
  const url = `${ETHERSCAN_BASE}?module=account&action=txlist&address=${encodeURIComponent(address)}&startblock=0&endblock=99999999&page=1&offset=20&sort=desc&apikey=${apiKey}`;

  try {
    const response = await fetch(url, { signal: createTimeoutSignal() });
    if (!response.ok) {
      console.error(`[Etherscan] Transaction fetch failed: ${response.status}`);
      return [];
    }
    const data = (await response.json()) as EtherscanResponse<EtherscanTx>;
    return data.status === '1' ? data.result : [];
  } catch (error) {
    console.error('[Etherscan] Transaction fetch error:', error);
    return [];
  }
}

async function fetchTokenTransactions(
  address: string,
  apiKey: string
): Promise<EtherscanTokenTx[]> {
  const url = `${ETHERSCAN_BASE}?module=account&action=tokentx&address=${encodeURIComponent(address)}&page=1&offset=20&sort=desc&apikey=${apiKey}`;

  try {
    const response = await fetch(url, { signal: createTimeoutSignal() });
    if (!response.ok) {
      console.error(`[Etherscan] Token tx fetch failed: ${response.status}`);
      return [];
    }
    const data = (await response.json()) as EtherscanResponse<EtherscanTokenTx>;
    return data.status === '1' ? data.result : [];
  } catch (error) {
    console.error('[Etherscan] Token tx fetch error:', error);
    return [];
  }
}

export class EtherscanProvider implements ChainProvider {
  async fetchRecentTransactions(address: string): Promise<WalletTransaction[]> {
    const apiKey = process.env.ETHERSCAN_API_KEY;
    if (!apiKey) {
      console.error('[Etherscan] Missing ETHERSCAN_API_KEY');
      return [];
    }

    const [ethTxs, tokenTxs, ethPrice] = await Promise.all([
      fetchEthTransactions(address, apiKey),
      fetchTokenTransactions(address, apiKey),
      fetchEthPrice(),
    ]);

    const transactions: WalletTransaction[] = [];

    // Process ETH transactions
    for (const tx of ethTxs) {
      const ethValue = weiToEth(tx.value);
      if (ethValue > 0) {
        transactions.push({
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: ethValue.toFixed(6),
          valueUsd: ethValue * ethPrice,
          tokenSymbol: 'ETH',
          timestamp: Number(tx.timeStamp),
        });
      }
    }

    // Process ERC-20 token transfers
    for (const tx of tokenTxs) {
      const decimalValue = tokenToDecimal(tx.value, tx.tokenDecimal);
      if (decimalValue > 0) {
        transactions.push({
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: decimalValue.toFixed(6),
          valueUsd: 0, // Token USD value requires per-token price lookup
          tokenSymbol: tx.tokenSymbol,
          timestamp: Number(tx.timeStamp),
        });
      }
    }

    return transactions;
  }
}
