import type { TweetProvider } from './types';
import { PollingProvider } from './providers/polling';
import { WebSocketProvider } from './providers/websocket';

export type TwitterProviderType = 'polling' | 'websocket' | 'sse' | 'ingest';

export function createTweetProvider(type?: TwitterProviderType): TweetProvider {
  const providerType = type || (process.env.TWITTER_PROVIDER as TwitterProviderType) || 'polling';

  switch (providerType) {
    case 'websocket': {
      return new WebSocketProvider();
    }
    case 'sse': {
      throw new Error('SSE provider is not yet implemented');
    }
    case 'ingest': {
      throw new Error('Ingest mode uses POST /api/ingest/tweets — no provider needed');
    }
    default: {
      return new PollingProvider();
    }
  }
}
