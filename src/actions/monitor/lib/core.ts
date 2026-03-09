'use server';

import type { MonitorEvent, MonitorState } from '../schemas/monitor';

export async function monitorEvent(event: MonitorEvent): Promise<MonitorState> {
  try {
    switch (event.type) {
      case 'social': {
        return {
          success: true,
          message: 'Social monitoring handled by pipeline',
        };
      }

      default: {
        throw new Error(`Unknown event type: ${event.type}`);
      }
    }
  } catch (error) {
    console.error('Failed to handle monitor event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to handle monitor event',
    };
  }
}
