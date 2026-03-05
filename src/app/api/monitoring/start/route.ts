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

    // Start social monitoring
    await socialMonitor.startMonitoring();

    return NextResponse.json({
      success: true,
      message: 'Social monitoring started',
      status: socialMonitor.getStatus(),
    });
  } catch (error) {
    console.error('Error starting monitoring:', error);
    return NextResponse.json({ error: 'Failed to start monitoring' }, { status: 500 });
  }
}

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

    // Import socialMonitor dynamically to avoid build-time errors
    const { socialMonitor } = await import('@/lib/services/apify/social-monitor');

    // Get monitoring status
    const status = socialMonitor.getStatus();

    return NextResponse.json({ status });
  } catch (error) {
    console.error('Error getting monitoring status:', error);
    return NextResponse.json({ error: 'Failed to get monitoring status' }, { status: 500 });
  }
}
