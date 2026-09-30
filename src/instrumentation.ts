/**
 * Background workers. They need a long-running Node process (not serverless): the X filtered
 * stream allows a single connection, and price alerts must be evaluated even when no dashboard is
 * open. Singletons are cached on globalThis so dev HMR does not start them twice.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  const flags = globalThis as typeof globalThis & { __cryptosentryWorkersStarted?: boolean };
  if (flags.__cryptosentryWorkersStarted) {
    return;
  }
  flags.__cryptosentryWorkersStarted = true;

  const { priceAlertWorker } = await import('@/lib/services/price/price-alert-worker');
  priceAlertWorker.start().catch((error) => {
    console.error('[Instrumentation] Failed to start price worker:', error);
  });

  const { socialMonitor } = await import('@/lib/services/twitter/social-monitor');
  socialMonitor.startMonitoring().catch((error) => {
    console.error('[Instrumentation] Failed to start social monitor:', error);
  });
}
