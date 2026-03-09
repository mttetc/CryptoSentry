export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.RETTIWT_API_KEY) {
    const { socialMonitor } = await import('@/lib/services/twitter/social-monitor');
    socialMonitor.startMonitoring().catch((error) => {
      console.error('[Instrumentation] Failed to start social monitor:', error);
    });
  }
}
