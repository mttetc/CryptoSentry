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

  // Price monitor: handled by SSE route (/api/alerts/stream) per-user
  // No need to start a global price monitor here

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
