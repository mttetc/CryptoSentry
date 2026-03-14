'use client';

import { useEffect, useRef, useState } from 'react';

interface PriceUpdateData {
  type: 'price:update';
  prices: Record<string, number>;
}

interface PriceTriggeredData {
  type: 'price:triggered';
  alertId: string;
  symbol: string;
  currentPrice: number;
  targetPrice: number;
  direction: 'above' | 'below';
}

interface WhaleTriggeredData {
  type: 'whale:triggered';
  alertId: string;
  txHash: string;
  tokenSymbol: string;
  valueUsd: number;
  chain: string;
  from: string;
  to: string;
}

export type TriggerEvent = PriceTriggeredData | WhaleTriggeredData;

interface UseAlertStreamOptions {
  onPriceUpdate?: (data: PriceUpdateData) => void;
  onPriceTriggered?: (data: PriceTriggeredData) => void;
  onWhaleTriggered?: (data: WhaleTriggeredData) => void;
}

const MAX_RETRIES = 5;
const BACKOFF_BASE_MS = 1000;

export function useAlertStream(options: UseAlertStreamOptions) {
  const [connected, setConnected] = useState(false);
  const [sseSupported, setSseSupported] = useState(true);
  const retriesRef = useRef(0);
  const esRef = useRef<EventSource | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!sseSupported) {
      return;
    }

    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      if (cancelled) {
        return;
      }

      const es = new EventSource('/api/alerts/stream');
      esRef.current = es;

      es.addEventListener('open', () => {
        setConnected(true);
        retriesRef.current = 0;
      });

      es.addEventListener('price:update', (e) => {
        const data = JSON.parse(e.data) as PriceUpdateData;
        data.type = 'price:update';
        optionsRef.current.onPriceUpdate?.(data);
      });

      es.addEventListener('price:triggered', (e) => {
        const data = JSON.parse(e.data) as PriceTriggeredData;
        data.type = 'price:triggered';
        optionsRef.current.onPriceTriggered?.(data);
      });

      es.addEventListener('whale:triggered', (e) => {
        const data = JSON.parse(e.data) as WhaleTriggeredData;
        data.type = 'whale:triggered';
        optionsRef.current.onWhaleTriggered?.(data);
      });

      es.addEventListener('error', () => {
        es.close();
        esRef.current = null;
        setConnected(false);

        if (cancelled) {
          return;
        }

        retriesRef.current += 1;
        if (retriesRef.current > MAX_RETRIES) {
          setSseSupported(false);
          return;
        }

        const delay = BACKOFF_BASE_MS * 2 ** (retriesRef.current - 1);
        reconnectTimer = setTimeout(connect, delay);
      });
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      esRef.current?.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [sseSupported]);

  return { connected, sseSupported };
}
