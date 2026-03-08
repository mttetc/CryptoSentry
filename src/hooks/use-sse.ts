import { sseEventSchema } from '@/actions/monitor/schemas/sse';
import { useEffect, useRef, useState } from 'react';

interface UseSSEOptions {
  onPriceUpdate?: (_data: { symbol: string; price: number; timestamp: number }) => void;
  onSocialUpdate?: (_data: { platform: string; content: string; timestamp: number }) => void;
  onInit?: (_data: { connectionId: string; status: string; userId?: string }) => void;
  onTimeout?: (_data: { reason: string; timestamp: number }) => void;
  onError?: (_data: { message: string; code?: string; details?: Record<string, unknown> }) => void;
}

function tryParseAndValidate(
  event: Event,
  type: string
): Record<string, unknown> | null {
  if (!(event instanceof MessageEvent)) {
    return null;
  }

  try {
    const data = JSON.parse(event.data);
    const result = sseEventSchema.safeParse({ type, data });

    if (!result.success) {
      console.error(`Invalid ${type} data:`, result.error);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Failed to process ${type} event:`, error);
    return null;
  }
}

export function useSSE(url: string, options: UseSSEOptions = {}) {
  const { onPriceUpdate, onSocialUpdate, onInit, onTimeout, onError } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const connect = (): void => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('open', () => {
        setIsConnected(true);
        setError(null);
        lastActivityRef.current = Date.now();
      });

      eventSource.addEventListener('init', (event) => {
        const data = tryParseAndValidate(event, 'init');
        if (!data) {
          return;
        }

        setConnectionId(data.connectionId as string);
        lastActivityRef.current = Date.now();
        onInit?.(data as Parameters<NonNullable<UseSSEOptions['onInit']>>[0]);
      });

      eventSource.addEventListener('ping', () => {
        lastActivityRef.current = Date.now();
      });

      if (onPriceUpdate) {
        eventSource.addEventListener('price_update', (event) => {
          const data = tryParseAndValidate(event, 'price_update');
          if (!data) {
            return;
          }

          lastActivityRef.current = Date.now();
          onPriceUpdate(data as Parameters<NonNullable<UseSSEOptions['onPriceUpdate']>>[0]);
        });
      }

      if (onSocialUpdate) {
        eventSource.addEventListener('social_update', (event) => {
          const data = tryParseAndValidate(event, 'social_update');
          if (!data) {
            return;
          }

          lastActivityRef.current = Date.now();
          onSocialUpdate(data as Parameters<NonNullable<UseSSEOptions['onSocialUpdate']>>[0]);
        });
      }

      if (onTimeout) {
        eventSource.addEventListener('timeout', (event) => {
          const data = tryParseAndValidate(event, 'timeout');
          if (!data) {
            return;
          }

          onTimeout(data as Parameters<NonNullable<UseSSEOptions['onTimeout']>>[0]);
          eventSource.close();
          setIsConnected(false);
          setError(`Connection timeout: ${data.reason}`);
        });
      }

      eventSource.addEventListener('error', (event) => {
        if (event instanceof MessageEvent) {
          const data = tryParseAndValidate(event, 'error');
          if (!data) {
            return;
          }

          onError?.(data as Parameters<NonNullable<UseSSEOptions['onError']>>[0]);
          setError(data.message as string);

          if (data.code === 'UNAUTHORIZED') {
            eventSource.close();
            setIsConnected(false);
          }
          return;
        }

        if (eventSource.readyState === EventSource.CLOSED) {
          setIsConnected(false);
          setError('Connection lost');
          eventSource.close();
        }
      });
    } catch (error) {
      console.error('Failed to create EventSource:', error);
      setError('Failed to connect to event source');
    }
  };

  useEffect(() => {
    connect();

    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  return {
    isConnected,
    error,
    connectionId,
  };
}
