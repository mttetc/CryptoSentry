import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiAuth, logApiRequest } from '@/lib/api/api-key-auth';
import { ApiError, apiErrorResponse } from '@/lib/api/api-error';
import { createServiceSupabaseClient } from '@/lib/supabase/server';
import { checkAlertLimit, checkSocialAlertLimits } from '@/lib/config/plans';
import { socialAlertSchema } from '@/actions/alerts/schemas';
import { priceAlertSchema } from '@/actions/alerts/schemas/price-alert-schemas';
import { socialMonitor } from '@/lib/services/twitter/social-monitor';
import { priceAlertWorker } from '@/lib/services/price/price-alert-worker';

const ENDPOINT = '/api/v1/alerts';

const createAlertSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('social') }).extend(socialAlertSchema.shape),
  z.object({ type: z.literal('price') }).extend(priceAlertSchema.shape),
]);

export async function GET(request: Request) {
  let apiKeyId = '';

  try {
    const auth = await requireApiAuth(request, 'alerts:read');
    apiKeyId = auth.apiKeyId;

    const supabase = createServiceSupabaseClient();

    const [socialResult, priceResult] = await Promise.all([
      supabase
        .from('social_alerts')
        .select(
          'id, platform, account, keywords, include_replies, sentiment_filter, is_active, created_at'
        )
        .eq('user_id', auth.userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('price_alerts')
        .select(
          'id, symbol, binance_symbol, target_price, direction, recurring, is_active, triggered_at, last_triggered_at, created_at'
        )
        .eq('user_id', auth.userId)
        .order('created_at', { ascending: false }),
    ]);

    if (socialResult.error) {
      throw socialResult.error;
    }
    if (priceResult.error) {
      throw priceResult.error;
    }

    logApiRequest(apiKeyId, ENDPOINT, 'GET', 200);
    return NextResponse.json({
      social_alerts: socialResult.data ?? [],
      price_alerts: priceResult.data ?? [],
    });
  } catch (error) {
    const response = apiErrorResponse(error);
    logApiRequest(apiKeyId, ENDPOINT, 'GET', response.status);
    return response;
  }
}

export async function POST(request: Request) {
  let apiKeyId = '';

  try {
    const auth = await requireApiAuth(request, 'alerts:write');
    apiKeyId = auth.apiKeyId;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError('Invalid JSON', 400);
    }

    const parsed = createAlertSchema.safeParse(body);
    if (!parsed.success) {
      logApiRequest(apiKeyId, ENDPOINT, 'POST', 400);
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServiceSupabaseClient();
    const input = parsed.data;

    if (input.type === 'social') {
      const limits = await checkSocialAlertLimits(auth.userId, {
        account: input.account,
        keywords: input.keywords,
        includeReplies: input.includeReplies,
      });
      if (!limits.allowed) {
        throw new ApiError(limits.error ?? 'Plan limit reached', 402);
      }

      const { data, error } = await supabase
        .from('social_alerts')
        .insert({
          user_id: auth.userId,
          platform: input.platform,
          account: input.account,
          keywords: input.keywords,
          include_replies: input.includeReplies,
          call_enabled: input.callEnabled,
          sentiment_filter: input.sentimentFilter ?? null,
          is_active: true,
        })
        .select(
          'id, platform, account, keywords, include_replies, sentiment_filter, is_active, created_at'
        )
        .single();

      if (error) {
        throw error;
      }

      socialMonitor.refreshAlerts().catch(console.error);
      logApiRequest(apiKeyId, ENDPOINT, 'POST', 201);
      return NextResponse.json(data, { status: 201 });
    }

    const limit = await checkAlertLimit(auth.userId);
    if (!limit.allowed) {
      throw new ApiError(limit.error ?? 'Plan limit reached', 402);
    }

    const { data, error } = await supabase
      .from('price_alerts')
      .insert({
        user_id: auth.userId,
        symbol: input.symbol,
        binance_symbol: input.binanceSymbol,
        logo: input.logo,
        target_price: input.targetPrice,
        direction: input.direction,
        recurring: input.recurring,
        is_active: true,
      })
      .select(
        'id, symbol, binance_symbol, target_price, direction, recurring, is_active, created_at'
      )
      .single();

    if (error) {
      throw error;
    }

    priceAlertWorker.refreshAlerts().catch(console.error);
    logApiRequest(apiKeyId, ENDPOINT, 'POST', 201);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const response = apiErrorResponse(error);
    logApiRequest(apiKeyId, ENDPOINT, 'POST', response.status);
    return response;
  }
}
