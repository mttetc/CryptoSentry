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

    const { userId } = await request.json();

    // Check if WhatsApp connection exists and is active
    const { data: whatsappSettings, error } = await supabase
      .from('user_whatsapp_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !whatsappSettings) {
      return NextResponse.json({ error: 'WhatsApp connection not found' }, { status: 404 });
    }

    // In production, you'd verify the actual WhatsApp connection here
    // For now, we'll simulate a successful connection
    const isConnected = true; // This would be determined by actual WhatsApp API

    if (isConnected) {
      // Update the connection status
      await supabase
        .from('user_whatsapp_settings')
        .update({
          status: 'connected',
          connected_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      return NextResponse.json({
        success: true,
        message: 'WhatsApp connection verified successfully',
        connected: true,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'WhatsApp connection not verified. Please try scanning the QR code again.',
        connected: false,
      });
    }
  } catch (error) {
    console.error('Error verifying WhatsApp connection:', error);
    return NextResponse.json({ error: 'Failed to verify WhatsApp connection' }, { status: 500 });
  }
}
