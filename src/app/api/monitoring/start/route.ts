import { AuthError, requireAuth } from '@/lib/api/auth';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  try {
    await requireAuth();
    const { socialMonitor } = await import('@/lib/services/apify/social-monitor');
    await socialMonitor.startMonitoring();

    return NextResponse.json({
      success: true,
      message: 'Social monitoring started',
      status: socialMonitor.getStatus(),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error starting monitoring:', error);
    return NextResponse.json({ error: 'Failed to start monitoring' }, { status: 500 });
  }
}

export async function GET(_request: NextRequest) {
  try {
    await requireAuth();
    const { socialMonitor } = await import('@/lib/services/apify/social-monitor');
    const status = socialMonitor.getStatus();

    return NextResponse.json({ success: true, status });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error getting monitoring status:', error);
    return NextResponse.json({ error: 'Failed to get monitoring status' }, { status: 500 });
  }
}
