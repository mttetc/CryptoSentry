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

    const { userId, phoneNumber } = await request.json();

    // Validate phone number format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use international format (e.g., +1234567890)' },
        { status: 400 }
      );
    }

    // For now, we'll simulate QR code generation
    // In production, you'd integrate with WhatsApp Business API
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=whatsapp-${userId}-${Date.now()}`;

    // Store the connection attempt in database
    await supabase.from('user_whatsapp_settings').upsert({
      user_id: userId,
      phone_number: phoneNumber,
      status: 'pending',
      qr_code_url: qrCodeUrl,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      qrCodeUrl,
      message: 'QR code generated. Please scan with WhatsApp.',
    });
  } catch (error) {
    console.error('Error generating WhatsApp QR code:', error);
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
  }
}
