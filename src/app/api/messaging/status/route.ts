import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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

    // Get Telegram settings
    const { data: telegramSettings } = await supabase
      .from('user_telegram_settings')
      .select('telegram_username, status')
      .eq('user_id', session.user.id)
      .single();

    // Get WhatsApp settings
    const { data: whatsappSettings } = await supabase
      .from('user_whatsapp_settings')
      .select('phone_number, status')
      .eq('user_id', session.user.id)
      .single();

    return NextResponse.json({
      telegram: {
        connected: telegramSettings?.status === 'connected',
        username: telegramSettings?.telegram_username,
      },
      whatsapp: {
        connected: whatsappSettings?.status === 'connected',
        phoneNumber: whatsappSettings?.phone_number,
      },
    });
  } catch (error) {
    console.error('Error fetching messaging status:', error);
    return NextResponse.json({ error: 'Failed to fetch messaging status' }, { status: 500 });
  }
}
