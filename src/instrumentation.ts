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

  // Influencer scorer (background event processing)
  if (process.env.OPENAI_API_KEY) {
    const { influencerScorer } = await import('@/lib/services/influencer/scorer');
    influencerScorer.startProcessing();
  }
}
