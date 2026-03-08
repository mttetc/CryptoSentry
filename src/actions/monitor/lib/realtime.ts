'use server';

import { encodeSSE } from './sse-utils';

interface SSEConnection {
  controller: ReadableStreamController<Uint8Array<ArrayBuffer>>;
  userId: string;
  lastActivity: number;
  subscriptions: {
    price: Set<string>;
    social: Set<string>;
  };
}

// Primary store: connectionId → connection
const SSE_CONNECTIONS = new Map<string, SSEConnection>();

// Reverse indexes: subscription key → Set<connectionId>
// Enables O(1) lookup instead of scanning all connections
const PRICE_SUBSCRIBERS = new Map<string, Set<string>>();
const SOCIAL_SUBSCRIBERS = new Map<string, Set<string>>();

// --- Reverse index helpers ---

function addToIndex(index: Map<string, Set<string>>, key: string, connectionId: string): void {
  const existing = index.get(key);
  if (existing) {
    existing.add(connectionId);
  } else {
    index.set(key, new Set([connectionId]));
  }
}

function removeFromIndex(index: Map<string, Set<string>>, key: string, connectionId: string): void {
  const existing = index.get(key);
  if (!existing) {
    return;
  }

  existing.delete(connectionId);
  if (existing.size === 0) {
    index.delete(key);
  }
}

function removeAllFromIndex(index: Map<string, Set<string>>, connectionId: string): void {
  for (const [key, subscribers] of index) {
    subscribers.delete(connectionId);
    if (subscribers.size === 0) {
      index.delete(key);
    }
  }
}

// --- Public API ---

export async function handleSSEConnection(
  userId: string,
  controller: ReadableStreamController<Uint8Array>
): Promise<string> {
  const connectionId = crypto.randomUUID();

  SSE_CONNECTIONS.set(connectionId, {
    controller,
    userId,
    lastActivity: Date.now(),
    subscriptions: {
      price: new Set(),
      social: new Set(),
    },
  });

  controller.enqueue(
    encodeSSE('init', {
      status: 'connected',
      connectionId,
      userId,
    })
  );

  return connectionId;
}

export async function subscribeToPriceUpdates(connectionId: string, symbol: string): Promise<void> {
  const connection = SSE_CONNECTIONS.get(connectionId);
  if (!connection) {
    return;
  }

  connection.subscriptions.price.add(symbol);
  addToIndex(PRICE_SUBSCRIBERS, symbol, connectionId);
}

export async function subscribeToSocialUpdates(
  connectionId: string,
  platform: string,
  keyword: string
): Promise<void> {
  const connection = SSE_CONNECTIONS.get(connectionId);
  if (!connection) {
    return;
  }

  const key = `${platform}:${keyword}`;
  connection.subscriptions.social.add(key);
  addToIndex(SOCIAL_SUBSCRIBERS, key, connectionId);
}

export async function unsubscribeFromPriceUpdates(
  connectionId: string,
  symbol: string
): Promise<void> {
  const connection = SSE_CONNECTIONS.get(connectionId);
  if (!connection) {
    return;
  }

  connection.subscriptions.price.delete(symbol);
  removeFromIndex(PRICE_SUBSCRIBERS, symbol, connectionId);
}

export async function unsubscribeFromSocialUpdates(
  connectionId: string,
  platform: string,
  keyword: string
): Promise<void> {
  const connection = SSE_CONNECTIONS.get(connectionId);
  if (!connection) {
    return;
  }

  const key = `${platform}:${keyword}`;
  connection.subscriptions.social.delete(key);
  removeFromIndex(SOCIAL_SUBSCRIBERS, key, connectionId);
}

export async function closeSSEConnection(connectionId: string): Promise<void> {
  const connection = SSE_CONNECTIONS.get(connectionId);
  if (!connection) {
    return;
  }

  try {
    connection.controller.close();
  } catch (error) {
    console.error('Error closing SSE controller:', error);
  }

  // Clean up reverse indexes
  removeAllFromIndex(PRICE_SUBSCRIBERS, connectionId);
  removeAllFromIndex(SOCIAL_SUBSCRIBERS, connectionId);
  SSE_CONNECTIONS.delete(connectionId);
}

/**
 * O(s) where s = number of subscribers for this specific key,
 * instead of O(n) where n = total connections.
 */
export async function broadcastUpdate(type: 'price' | 'social', data: Record<string, unknown>): Promise<void> {
  const eventType = type === 'price' ? 'price_update' : 'social_update';

  const subscriberKey = type === 'price'
    ? String(data.symbol)
    : `${String(data.platform)}:${String(data.keyword)}`;

  const index = type === 'price' ? PRICE_SUBSCRIBERS : SOCIAL_SUBSCRIBERS;
  const subscribers = index.get(subscriberKey);

  if (!subscribers || subscribers.size === 0) {
    return;
  }

  const encoded = encodeSSE(eventType, data);

  for (const connectionId of subscribers) {
    const connection = SSE_CONNECTIONS.get(connectionId);
    if (!connection) {
      continue;
    }

    try {
      connection.controller.enqueue(encoded);
    } catch (error) {
      console.error(`Error broadcasting to connection ${connectionId}:`, error);
      await closeSSEConnection(connectionId);
    }
  }
}
