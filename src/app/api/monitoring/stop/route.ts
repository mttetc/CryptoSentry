import { AuthError, requireAuth } from '@/lib/api/auth';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  try {
    await requireAuth();
    const { socialMonitor } = await import('@/lib/services/apify/social-monitor');
    await socialMonitor.stopMonitoring();

    return NextResponse.json({
      success: true,
      message: 'Social monitoring stopped',
      status: socialMonitor.getStatus(),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error stopping monitoring:', error);
    return NextResponse.json({ error: 'Failed to stop monitoring' }, { status: 500 });
  }
}
