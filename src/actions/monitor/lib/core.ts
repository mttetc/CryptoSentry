'use server';

import { monitorPrice } from '@/lib/services/monitoring/price';
import type { MonitorEvent, MonitorState } from '../schemas/monitor';

export async function monitorEvent(event: MonitorEvent): Promise<MonitorState> {
  try {
    switch (event.type) {
      case 'price':
        if (!event.data.symbol || !event.data.price) {
          throw new Error('Invalid price event data');
        }
        return await monitorPrice(event.data.symbol, event.data.price);

      case 'social':
        // Social monitoring will be handled by Apify service
        return {
          success: true,
          message: 'Social monitoring handled by Apify service',
        };

      default:
        throw new Error('Unknown event type');
    }
  } catch (error) {
    console.error('Failed to handle monitor event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to handle monitor event',
    };
  }
}
