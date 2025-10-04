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

    const { userId, telegramUsername } = await request.json();

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store verification code in database
    await supabase.from('user_telegram_settings').upsert({
      user_id: userId,
      telegram_username: telegramUsername,
      verification_code: verificationCode,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    // Send verification code via Telegram (simulated for now)
    // In production, you'd use the actual Telegram Bot API
    console.log(`Sending verification code ${verificationCode} to @${telegramUsername}`);

    // For demo purposes, we'll just return success
    // In production, you'd actually send the message via Telegram API
    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your Telegram',
    });
  } catch (error) {
    console.error('Error sending Telegram verification:', error);
    return NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 });
  }
}
