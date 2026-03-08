import { AuthError, requireAuth } from '@/lib/api/auth';
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(_: NextRequest) {
  try {
    const { supabase, userId } = await requireAuth();

    const { data, error } = await supabase
      .from('user_notification_settings')
      .select('phone, prefer_sms, active_24h, quiet_hours_start, quiet_hours_end, weekends_enabled')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      const defaultSettings = {
        user_id: userId,
        phone: '',
        prefer_sms: false,
        active_24h: true,
        quiet_hours_start: null,
        quiet_hours_end: null,
        weekends_enabled: true,
      };

      const { error: insertError } = await supabase
        .from('user_notification_settings')
        .insert(defaultSettings);

      if (insertError) {
        throw insertError;
      }

      return NextResponse.json({ success: true, ...defaultSettings }, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, ...data }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching notification settings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { supabase, userId } = await requireAuth();
    const body = await request.json();

    if (body.phone && !/^\+?[1-9]\d{1,14}$/.test(body.phone)) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    if (body.quiet_hours_start && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(body.quiet_hours_start)) {
      return NextResponse.json({ error: 'Invalid quiet hours start time format' }, { status: 400 });
    }

    if (body.quiet_hours_end && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(body.quiet_hours_end)) {
      return NextResponse.json({ error: 'Invalid quiet hours end time format' }, { status: 400 });
    }

    const { error } = await supabase.from('user_notification_settings').upsert({
      user_id: userId,
      phone: body.phone,
      prefer_sms: Boolean(body.prefer_sms),
      active_24h: Boolean(body.active_24h),
      quiet_hours_start: body.quiet_hours_start || null,
      quiet_hours_end: body.quiet_hours_end || null,
      weekends_enabled: Boolean(body.weekends_enabled),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating notification settings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
