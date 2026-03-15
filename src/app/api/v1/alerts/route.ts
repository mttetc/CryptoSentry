import { NextResponse } from 'next/server';
import { requireApiAuth, logApiRequest } from '@/lib/api/api-key-auth';
import { createServiceSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  let apiKeyId = '';

  try {
    const auth = await requireApiAuth(request, 'alerts:read');
    apiKeyId = auth.apiKeyId;

    const supabase = createServiceSupabaseClient();

    const [socialResult, priceResult] = await Promise.all([
      supabase
        .from('social_alerts')
        .select('*')
        .eq('user_id', auth.userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('price_alerts')
        .select('*')
        .eq('user_id', auth.userId)
        .order('created_at', { ascending: false }),
    ]);

    const response = {
      social_alerts: socialResult.data ?? [],
      price_alerts: priceResult.data ?? [],
    };

    logApiRequest(apiKeyId, '/api/v1/alerts', 'GET', 200).catch(() => {
      // Fire and forget
    });

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = getErrorStatus(message);

    if (apiKeyId) {
      logApiRequest(apiKeyId, '/api/v1/alerts', 'GET', status).catch(() => {
        // Fire and forget
      });
    }

    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  let apiKeyId = '';

  try {
    const auth = await requireApiAuth(request, 'alerts:write');
    apiKeyId = auth.apiKeyId;

    const body = (await request.json()) as Record<string, unknown>;
    const alertType = String(body.type ?? '');

    if (alertType !== 'social' && alertType !== 'price') {
      return NextResponse.json(
        { error: 'Invalid alert type. Must be "social" or "price".' },
        { status: 400 }
      );
    }

    const supabase = createServiceSupabaseClient();

    if (alertType === 'social') {
      const { data, error } = await supabase
        .from('social_alerts')
        .insert({
          user_id: auth.userId,
          platform: String(body.platform ?? 'twitter'),
          account: String(body.account ?? ''),
          keywords: (body.keywords as string[]) ?? [],
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      logApiRequest(apiKeyId, '/api/v1/alerts', 'POST', 201).catch(() => {
        // Fire and forget
      });

      return NextResponse.json(data, { status: 201 });
    }

    // Price alert
    const validDirections = ['above', 'below', 'exact'] as const;
    const rawDirection = String(body.direction ?? 'above');
    const direction = validDirections.includes(rawDirection as (typeof validDirections)[number])
      ? (rawDirection as (typeof validDirections)[number])
      : 'above';

    const { data, error } = await supabase
      .from('price_alerts')
      .insert({
        user_id: auth.userId,
        symbol: String(body.symbol ?? ''),
        binance_symbol: String(body.binanceSymbol ?? ''),
        target_price: Number(body.targetPrice ?? 0),
        direction,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    logApiRequest(apiKeyId, '/api/v1/alerts', 'POST', 201).catch(() => {
      // Fire and forget
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = getErrorStatus(message);

    if (apiKeyId) {
      logApiRequest(apiKeyId, '/api/v1/alerts', 'POST', status).catch(() => {
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
