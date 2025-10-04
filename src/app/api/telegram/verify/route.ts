import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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

    const { userId, code } = await request.json();

    // Get stored verification code
    const { data: telegramSettings, error } = await supabase
      .from('user_telegram_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !telegramSettings) {
      return NextResponse.json({ error: 'Telegram settings not found' }, { status: 404 });
    }

    // Verify the code
    if (telegramSettings.verification_code !== code) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    // Update status to connected
    await supabase
      .from('user_telegram_settings')
      .update({
        status: 'connected',
        verified_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return NextResponse.json({
      success: true,
      message: 'Telegram account verified successfully',
    });
  } catch (error) {
    console.error('Error verifying Telegram code:', error);
    return NextResponse.json({ error: 'Failed to verify Telegram code' }, { status: 500 });
  }
}
