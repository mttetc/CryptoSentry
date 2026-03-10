import { NextResponse } from 'next/server';
import { requireApiAuth, logApiRequest } from '@/lib/api/api-key-auth';
import { createServiceSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  let apiKeyId = '';

  try {
    const auth = await requireApiAuth(request, 'alerts:read');
    apiKeyId = auth.apiKeyId;

    const supabase = createServiceSupabaseClient();

    const { data, error } = await supabase
      .from('influencer_scores')
      .select('*')
      .order('score', { ascending: false });

    if (error) {
      throw error;
    }

    logApiRequest(apiKeyId, '/api/v1/scores', 'GET', 200).catch(() => {
      // Fire and forget
    });

    return NextResponse.json({ scores: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = getErrorStatus(message);

    if (apiKeyId) {
      logApiRequest(apiKeyId, '/api/v1/scores', 'GET', status).catch(() => {
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
