import { createHash, randomBytes } from 'node:crypto';
import { createServiceSupabaseClient } from '@/lib/supabase/server';
import { checkFeatureAccess } from '@/lib/config/plans';
import { ApiError } from './api-error';

export interface ApiAuthResult {
  userId: string;
  apiKeyId: string;
  scopes: string[];
}

/**
 * Generate a new API key with hash and prefix for storage.
 * The full key is shown once to the user; only the hash is stored.
 */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const raw = randomBytes(32).toString('hex');
  const key = `cs_live_${raw}`;
  const hash = createHash('sha256').update(key).digest('hex');
  const prefix = key.slice(0, 16);
  return { key, hash, prefix };
}

/**
 * Authenticate an API request via Bearer token.
 * Validates the key, checks expiry, verifies scope, re-checks the plan and enforces rate limits.
 */
export async function requireApiAuth(
  request: Request,
  requiredScope?: string
): Promise<ApiAuthResult> {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new ApiError('Missing API key', 401);
  }

  const key = header.slice(7);
  const hash = createHash('sha256').update(key).digest('hex');

  const supabase = createServiceSupabaseClient();
  const { data: apiKey } = await supabase
    .from('api_keys')
    .select('id, user_id, scopes, rate_limit, is_active, expires_at')
    .eq('key_hash', hash)
    .maybeSingle();

  if (!apiKey || !apiKey.is_active) {
    throw new ApiError('Invalid API key', 401);
  }

  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    throw new ApiError('API key expired', 403);
  }

  if (requiredScope && !apiKey.scopes.includes(requiredScope)) {
    throw new ApiError('Insufficient scope', 403);
  }

  // Plan can change after the key was issued (downgrade, expiry).
  const access = await checkFeatureAccess(apiKey.user_id, 'api');
  if (!access.allowed) {
    throw new ApiError('API access requires the Premium plan', 403);
  }

  // Rate limit check: count requests in the last hour
  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await supabase
    .from('api_request_logs')
    .select('*', { count: 'exact', head: true })
    .eq('api_key_id', apiKey.id)
    .gte('created_at', oneHourAgo);

  if ((count ?? 0) >= apiKey.rate_limit) {
    throw new ApiError('Rate limit exceeded', 429);
  }

  // Update last_used_at (fire-and-forget)
  void supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKey.id)
    .then(({ error }) => {
      if (error) {
        console.error('[API] Failed to update last_used_at:', error);
      }
    });

  return {
    userId: apiKey.user_id,
    apiKeyId: apiKey.id,
    scopes: apiKey.scopes,
  };
}

/**
 * Log an API request for rate limiting and audit purposes. Fire-and-forget safe.
 */
export function logApiRequest(
  apiKeyId: string,
  endpoint: string,
  method: string,
  statusCode: number
): void {
  if (!apiKeyId) {
    return;
  }
  const supabase = createServiceSupabaseClient();
  void supabase
    .from('api_request_logs')
    .insert({ api_key_id: apiKeyId, endpoint, method, status_code: statusCode })
    .then(({ error }) => {
      if (error) {
        console.error('[API] Failed to log request:', error);
      }
    });
}
