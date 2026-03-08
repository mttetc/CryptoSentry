import { type NextRequest, NextResponse } from 'next/server';
import { AuthError, requireAuth } from '@/lib/api/auth';
import { getSocialAlertsWithStats } from '@/actions/alerts/lib/queries';

export async function GET(_request: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const alertsWithStats = await getSocialAlertsWithStats(userId);

    return NextResponse.json({
      success: true,
      alerts: alertsWithStats,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error in GET /api/alerts/social:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
