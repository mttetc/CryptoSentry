import { createServerSupabaseClient } from '@/lib/supabase/server';
import { socialMonitor } from '@/lib/services/apify/social-monitor';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Test Apify connection
    let apifyStatus = { connected: false, error: undefined as string | undefined };
    try {
      // This would test the actual Apify connection
      // For now, we'll check if the API token is set
      apifyStatus.connected = !!process.env.APIFY_API_TOKEN;
      if (!apifyStatus.connected) {
        apifyStatus.error = 'APIFY_API_TOKEN not set';
      }
    } catch (error) {
      apifyStatus.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Test Database connection
    let databaseStatus = { connected: false, error: undefined as string | undefined };
    try {
      const { error } = await supabase.from('social_alerts').select('count').limit(1);
      databaseStatus.connected = !error;
      if (error) {
        databaseStatus.error = error.message;
      }
    } catch (error) {
      databaseStatus.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Test Telegram connection
    let telegramStatus = { connected: false, error: undefined as string | undefined };
    try {
      telegramStatus.connected = !!(
        process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME
      );
      if (!telegramStatus.connected) {
        telegramStatus.error = 'Telegram credentials not configured';
      }
    } catch (error) {
      telegramStatus.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Test WhatsApp connection
    let whatsappStatus = { connected: false, error: undefined as string | undefined };
    try {
      whatsappStatus.connected = !!(
        process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
      );
      if (!whatsappStatus.connected) {
        whatsappStatus.error = 'WhatsApp credentials not configured';
      }
    } catch (error) {
      whatsappStatus.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Get monitoring status
    const monitoringStatus = socialMonitor.getStatus();

    return NextResponse.json({
      apify: apifyStatus,
      database: databaseStatus,
      telegram: telegramStatus,
      whatsapp: whatsappStatus,
      monitoring: monitoringStatus,
    });
  } catch (error) {
    console.error('Error fetching system status:', error);
    return NextResponse.json({ error: 'Failed to fetch system status' }, { status: 500 });
  }
}
