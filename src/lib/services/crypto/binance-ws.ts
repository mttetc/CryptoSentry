import WebSocket from 'ws';
import type { RealtimePriceStream, PriceCallback } from './types';

/**
 * Binance WebSocket price stream.
 * Subscribes to mini ticker streams for given Binance symbols.
 * Calls onPrice with a map of UPPERCASE Binance symbol → USD price on every tick.
 */
export class BinancePriceStream implements RealtimePriceStream {
  private ws: WebSocket | null = null;
  private onPrice: PriceCallback;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private alive = true;
  private currentSymbols: string[] = [];

  constructor(onPrice: PriceCallback) {
    this.onPrice = onPrice;
  }

  /**
   * Subscribe to price updates for a set of Binance symbols (e.g. ["btcusdt", "ethusdt"]).
   * Symbols are normalized to lowercase for the stream URL.
   * Can be called multiple times to update the subscription list.
   */
  subscribe(binanceSymbols: string[]): void {
    const symbols = binanceSymbols.map((s) => s.toLowerCase());

    if (symbols.length === 0) {
      return;
    }

    // Only reconnect if symbols changed
    const sorted = [...symbols].toSorted().join(',');
    const currentSorted = [...this.currentSymbols].toSorted().join(',');
    if (sorted === currentSorted && this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.currentSymbols = symbols;
    this.connect(symbols);
  }

  private connect(symbols: string[]): void {
    this.close();

    // Combined stream: multiple mini tickers
    const streams = symbols.map((s) => `${s}@miniTicker`).join('/');
    const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;

    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      console.warn(`[BinanceWS] Connected with ${symbols.length} streams`);
    });

    this.ws.on('message', (raw: WebSocket.Data) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          stream: string;
          data: { s: string; c: string };
        };

        // "s" = symbol (e.g. "BTCUSDT"), "c" = close/current price
        const binanceSymbol = msg.data.s; // Already uppercase from Binance
        const price = Number.parseFloat(msg.data.c);

        if (!Number.isNaN(price)) {
          this.onPrice({ [binanceSymbol]: price });
        }
      } catch {
        // Ignore parse errors (ping frames, etc.)
      }
    });

    this.ws.on('close', () => {
      if (this.alive) {
        console.warn('[BinanceWS] Disconnected, reconnecting in 3s...');
        this.reconnectTimer = setTimeout(() => {
          if (this.alive) {
            this.connect(this.currentSymbols);
          }
        }, 3000);
      }
    });

    this.ws.on('error', (err: Error) => {
      console.error('[BinanceWS] Error:', err.message);
      // Close event will handle reconnection
    });
  }

  close(): void {
    this.alive = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
  }

  /** Re-enable after close (for reuse) */
  revive(): void {
    this.alive = true;
  }
}
