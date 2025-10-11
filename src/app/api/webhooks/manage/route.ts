import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apifyWebhookManager } from '@/lib/services/apify/webhook-manager';

export async function GET(_request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // List all webhooks
    const webhooks = await apifyWebhookManager.listWebhooks();

    return NextResponse.json({
      success: true,
      webhooks: webhooks.map((webhook) => ({
        id: webhook.id,
        eventTypes: webhook.eventTypes,
        requestUrl: webhook.requestUrl,
        isEnabled: webhook.isEnabled,
        createdAt: webhook.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error listing webhooks:', error);
    return NextResponse.json({ error: 'Failed to list webhooks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, webhookId, config } = body;

    switch (action) {
      case 'create':
        const newWebhookId = await apifyWebhookManager.createWebhook(config);
        return NextResponse.json({
          success: true,
          webhookId: newWebhookId,
          message: 'Webhook created successfully',
        });

      case 'update':
        if (!webhookId) {
          return NextResponse.json({ error: 'Webhook ID is required for update' }, { status: 400 });
        }
        await apifyWebhookManager.updateWebhook(webhookId, config);
        return NextResponse.json({
          success: true,
          message: 'Webhook updated successfully',
        });

      case 'delete':
        if (!webhookId) {
          return NextResponse.json({ error: 'Webhook ID is required for delete' }, { status: 400 });
        }
        await apifyWebhookManager.deleteWebhook(webhookId);
        return NextResponse.json({
          success: true,
          message: 'Webhook deleted successfully',
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error managing webhook:', error);
    return NextResponse.json({ error: 'Failed to manage webhook' }, { status: 500 });
  }
}
