import { type NextRequest, NextResponse } from 'next/server';
import { AuthError, requireAuthFromRequest } from '@/lib/api/auth';
import { getPriceAlertsWithStats } from '@/actions/alerts/lib/price-queries';

export async function GET(request: NextRequest) {
  try {
    const { supabase, userId } = await requireAuthFromRequest(request);
    const alerts = await getPriceAlertsWithStats(supabase, userId);

    return NextResponse.json({
      success: true,
      alerts,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error in GET /api/alerts/price:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
