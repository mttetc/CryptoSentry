// Apify Webhook Manager
// Manages webhook subscriptions for real-time monitoring

import { z } from 'zod';

const APIFY_BASE_URL = 'https://api.apify.com/v2';
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

// Webhook configuration schema
const webhookConfigSchema = z.object({
  eventTypes: z
    .array(z.enum(['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED', 'ACTOR.RUN.TIMED_OUT']))
    .readonly(),
  requestUrl: z.string().url(),
  isEnabled: z.boolean().default(true),
  condition: z.string().optional(),
  template: z.string().optional(),
});

export type WebhookConfig = z.infer<typeof webhookConfigSchema>;

export class ApifyWebhookManager {
  private webhookId: string | null = null;

  async createWebhook(config: WebhookConfig): Promise<string> {
    if (!APIFY_API_TOKEN) {
      throw new Error('APIFY_API_TOKEN not configured');
    }

    const webhookData = webhookConfigSchema.parse(config);

    const response = await fetch(`${APIFY_BASE_URL}/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${APIFY_API_TOKEN}`,
      },
      body: JSON.stringify(webhookData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`Failed to create webhook: ${error.message}`);
    }

    const result = await response.json();
    this.webhookId = result.data.id;

    console.warn('Apify webhook created:', this.webhookId);
    return this.webhookId!;
  }

  async updateWebhook(webhookId: string, config: Partial<WebhookConfig>): Promise<void> {
    if (!APIFY_API_TOKEN) {
      throw new Error('APIFY_API_TOKEN not configured');
    }

    const response = await fetch(`${APIFY_BASE_URL}/webhooks/${webhookId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${APIFY_API_TOKEN}`,
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`Failed to update webhook: ${error.message}`);
    }

    console.warn('Apify webhook updated:', webhookId);
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    if (!APIFY_API_TOKEN) {
      throw new Error('APIFY_API_TOKEN not configured');
    }

    const response = await fetch(`${APIFY_BASE_URL}/webhooks/${webhookId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${APIFY_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`Failed to delete webhook: ${error.message}`);
    }

    console.warn('Apify webhook deleted:', webhookId);
    this.webhookId = null;
  }

  async listWebhooks(): Promise<any[]> {
    if (!APIFY_API_TOKEN) {
      throw new Error('APIFY_API_TOKEN not configured');
    }

    const response = await fetch(`${APIFY_BASE_URL}/webhooks`, {
      headers: {
        Authorization: `Bearer ${APIFY_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`Failed to list webhooks: ${error.message}`);
    }

    const result = await response.json();
    return result.data.items;
  }

  async getWebhook(webhookId: string): Promise<any> {
    if (!APIFY_API_TOKEN) {
      throw new Error('APIFY_API_TOKEN not configured');
    }

    const response = await fetch(`${APIFY_BASE_URL}/webhooks/${webhookId}`, {
      headers: {
        Authorization: `Bearer ${APIFY_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`Failed to get webhook: ${error.message}`);
    }

    return await response.json();
  }

  getWebhookId(): string | null {
    return this.webhookId;
  }
}

// Singleton instance
export const apifyWebhookManager = new ApifyWebhookManager();
