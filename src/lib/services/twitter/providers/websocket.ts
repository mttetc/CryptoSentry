import type { TweetProvider, TweetProviderConfig, TweetCallback } from '../types';

/**
 * WebSocket provider stub for TwitterAPI.io (wss://ws.twitterapi.io/...)
 * Ready to implement when needed — requires TWITTER_API_IO_KEY env var.
 */
export class WebSocketProvider implements TweetProvider {
  async start(_config: TweetProviderConfig): Promise<void> {
    throw new Error(
      'WebSocketProvider is not yet implemented. ' +
      'Set TWITTER_PROVIDER=polling to use the polling provider, ' +
      'or TWITTER_PROVIDER=apify for the Apify fallback.'
    );
  }

  async stop(): Promise<void> {
    // No-op for stub
  }

  onTweets(_callback: TweetCallback): void {
    // No-op for stub
  }
}
