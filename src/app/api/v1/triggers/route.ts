import { NextResponse } from 'next/server';
import { requireApiAuth, logApiRequest } from '@/lib/api/api-key-auth';
import { createServiceSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  let apiKeyId = '';

  try {
    const auth = await requireApiAuth(request, 'alerts:read');
    apiKeyId = auth.apiKeyId;

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? '50')));
    const offset = (page - 1) * limit;

    const supabase = createServiceSupabaseClient();

    // First get the user's alert IDs to scope triggers
    const [socialAlerts, priceAlerts] = await Promise.all([
      supabase
        .from('social_alerts')
        .select('id')
        .eq('user_id', auth.userId),
      supabase
        .from('price_alerts')
        .select('id')
        .eq('user_id', auth.userId),
    ]);

    const alertIds = [
      ...(socialAlerts.data ?? []).map((a: Record<string, unknown>) => String(a.id)),
      ...(priceAlerts.data ?? []).map((a: Record<string, unknown>) => String(a.id)),
    ];

    if (alertIds.length === 0) {
      logApiRequest(apiKeyId, '/api/v1/triggers', 'GET', 200).catch(() => {
        // Fire and forget
      });

      return NextResponse.json({
        triggers: [],
        pagination: { page, limit, total: 0 },
      });
    }

    const { data, count } = await supabase
      .from('alert_triggers')
      .select('*', { count: 'exact' })
      .in('alert_id', alertIds)
      .order('triggered_at', { ascending: false })
      .range(offset, offset + limit - 1);

    logApiRequest(apiKeyId, '/api/v1/triggers', 'GET', 200).catch(() => {
      // Fire and forget
    });

    return NextResponse.json({
      triggers: data ?? [],
      pagination: { page, limit, total: count ?? 0 },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = getErrorStatus(message);

    if (apiKeyId) {
      logApiRequest(apiKeyId, '/api/v1/triggers', 'GET', status).catch(() => {
        // Fire and forget
      });
    }

    return NextResponse.json({ error: message }, { status });
  }
}

// --- Helpers ---

function getErrorStatus(message: string): number {
  if (message === 'Missing API key' || message === 'Invalid API key') {
    return 401;
  }
  if (message === 'API key expired' || message === 'Insufficient scope') {
    return 403;
  }
  if (message === 'Rate limit exceeded') {
    return 429;
  }
  return 500;
}
