import { AuthError, requireAuth } from '@/lib/api/auth';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    const { supabase, userId } = await requireAuth();

    // Parallel queries — independent data sources
    const [telegramResult, whatsappResult] = await Promise.all([
      supabase
        .from('user_telegram_settings')
        .select('telegram_username, status')
        .eq('user_id', userId)
        .single(),
      supabase
        .from('user_whatsapp_settings')
        .select('phone_number, status')
        .eq('user_id', userId)
        .single(),
    ]);

    return NextResponse.json({
      success: true,
      telegram: {
        connected: telegramResult.data?.status === 'connected',
        username: telegramResult.data?.telegram_username,
      },
      whatsapp: {
        connected: whatsappResult.data?.status === 'connected',
        phoneNumber: whatsappResult.data?.phone_number,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching messaging status:', error);
    return NextResponse.json({ error: 'Failed to fetch messaging status' }, { status: 500 });
  }
}
