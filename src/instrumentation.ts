export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  // Social monitor (Twitter polling)
  if (process.env.RETTIWT_API_KEY) {
    const { socialMonitor } = await import('@/lib/services/twitter/social-monitor');
    socialMonitor.startMonitoring().catch((error) => {
      console.error('[Instrumentation] Failed to start social monitor:', error);
    });
  }

  // Price monitor (CoinGecko polling)
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const { priceMonitor } = await import('@/lib/services/crypto/price-monitor');
    priceMonitor.startMonitoring().catch((error) => {
      console.error('[Instrumentation] Failed to start price monitor:', error);
    });
  }

  // Wallet monitor (Etherscan + Solscan polling)
  if (process.env.ETHERSCAN_API_KEY || process.env.SOLSCAN_API_KEY) {
    const { walletMonitor } = await import('@/lib/services/blockchain/wallet-monitor');
    walletMonitor.startMonitoring().catch((error) => {
      console.error('[Instrumentation] Failed to start wallet monitor:', error);
    });
  }

  // Influencer scorer (background event processing)
  if (process.env.OPENAI_API_KEY) {
    const { influencerScorer } = await import('@/lib/services/influencer/scorer');
    influencerScorer.startProcessing();
  }
}
