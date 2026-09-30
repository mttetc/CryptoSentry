import { NextResponse } from 'next/server';
import { requireApiAuth, logApiRequest } from '@/lib/api/api-key-auth';
import { apiErrorResponse } from '@/lib/api/api-error';
import { createServiceSupabaseClient } from '@/lib/supabase/server';

const ENDPOINT = '/api/v1/triggers';

export async function GET(request: Request) {
  let apiKeyId = '';

  try {
    const auth = await requireApiAuth(request, 'alerts:read');
    apiKeyId = auth.apiKeyId;

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? '50') || 50));
    const offset = (page - 1) * limit;

    const supabase = createServiceSupabaseClient();

    // Every trigger row (social and price) carries user_id, so scoping is direct.
    const { data, count, error } = await supabase
      .from('alert_triggers')
      .select('id, type, alert_id, price_alert_id, sentiment, summary, data, triggered_at', {
        count: 'exact',
      })
      .eq('user_id', auth.userId)
      .order('triggered_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    logApiRequest(apiKeyId, ENDPOINT, 'GET', 200);
    return NextResponse.json({
      triggers: data ?? [],
      pagination: { page, limit, total: count ?? 0 },
    });
  } catch (error) {
    const response = apiErrorResponse(error);
    logApiRequest(apiKeyId, ENDPOINT, 'GET', response.status);
    return response;
  }
}
