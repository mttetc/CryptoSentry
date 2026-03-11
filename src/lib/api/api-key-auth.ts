import { createHash, randomBytes } from 'node:crypto';
import { createServiceSupabaseClient } from '@/lib/supabase/server';

export interface ApiAuthResult {
  userId: string;
  apiKeyId: string;
  scopes: string[];
}

interface ApiKeyRow {
  id: string;
  user_id: string;
  scopes: string[];
  rate_limit: number;
  is_active: boolean;
  expires_at: string | null;
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
 * Validates the key, checks expiry, verifies scope, and enforces rate limits.
 */
export async function requireApiAuth(
  request: Request,
  requiredScope?: string
): Promise<ApiAuthResult> {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new Error('Missing API key');
  }

  const key = header.slice(7);
  const hash = createHash('sha256').update(key).digest('hex');

  const supabase = createServiceSupabaseClient();
  const { data: apiKey } = await supabase
    .from('api_keys')
    .select('id, user_id, scopes, rate_limit, is_active, expires_at')
    .eq('key_hash', hash)
    .single();

  if (!apiKey || !apiKey.is_active) {
    throw new Error('Invalid API key');
  }

  const typedKey = apiKey as ApiKeyRow;

  if (typedKey.expires_at && new Date(typedKey.expires_at) < new Date()) {
    throw new Error('API key expired');
  }

  if (requiredScope && !typedKey.scopes.includes(requiredScope)) {
    throw new Error('Insufficient scope');
  }

  // Rate limit check: count requests in the last hour
  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await supabase
    .from('api_request_logs')
    .select('*', { count: 'exact', head: true })
    .eq('api_key_id', typedKey.id)
    .gte('created_at', oneHourAgo);

  if ((count ?? 0) >= typedKey.rate_limit) {
    throw new Error('Rate limit exceeded');
  }

  // Update last_used_at (fire-and-forget)
  supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', typedKey.id)
    .then(() => {
      // Intentionally empty - fire and forget
    });

  return {
    userId: typedKey.user_id,
    apiKeyId: typedKey.id,
    scopes: typedKey.scopes,
  };
}

/**
 * Log an API request for rate limiting and audit purposes.
 */
export async function logApiRequest(
  apiKeyId: string,
  endpoint: string,
  method: string,
  statusCode: number
): Promise<void> {
  const supabase = createServiceSupabaseClient();
  await supabase.from('api_request_logs').insert({
    api_key_id: apiKeyId,
    endpoint,
    method,
    status_code: statusCode,
  });
}
