import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Import socialMonitor dynamically to avoid build-time errors
    const { socialMonitor } = await import('@/lib/services/apify/social-monitor');

    // Stop social monitoring
    await socialMonitor.stopMonitoring();

    return NextResponse.json({
      success: true,
      message: 'Social monitoring stopped',
      status: socialMonitor.getStatus(),
    });
  } catch (error) {
    console.error('Error stopping monitoring:', error);
    return NextResponse.json({ error: 'Failed to stop monitoring' }, { status: 500 });
  }
}
