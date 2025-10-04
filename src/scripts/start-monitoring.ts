#!/usr/bin/env ts-node

/**
 * Start CryptoSentry monitoring system
 * This script starts the social monitoring and keeps it running
 * Run with: npx ts-node src/scripts/start-monitoring.ts
 */

import { socialMonitor } from '../lib/services/apify/social-monitor';

async function startMonitoring() {
  console.log('🚀 Starting CryptoSentry Monitoring System...');

  try {
    // Start social monitoring
    await socialMonitor.startMonitoring();

    const status = socialMonitor.getStatus();
    console.log('📊 Monitoring Status:', status);

    console.log('✅ Monitoring system started successfully!');
    console.log('📱 The system will now monitor Twitter accounts and send alerts');
    console.log('🔄 Press Ctrl+C to stop monitoring');

    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\n🛑 Stopping monitoring system...');
      await socialMonitor.stopMonitoring();
      console.log('✅ Monitoring stopped');
      process.exit(0);
    });

    // Keep alive
    setInterval(() => {
      const status = socialMonitor.getStatus();
      console.log(`📊 Status: ${status.activeAccounts} accounts, ${status.totalAlerts} alerts`);
    }, 60000); // Log status every minute
  } catch (error) {
    console.error('❌ Failed to start monitoring:', error);
    process.exit(1);
  }
}

// Start the monitoring system
if (require.main === module) {
  startMonitoring().catch(console.error);
}
