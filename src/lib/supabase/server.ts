import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

/**
 * Create a Supabase client with service role privileges.
 * All DB access is server-side only — auth enforced by requireAuth() at app level.
 * RLS still active as defense-in-depth against anon key misuse.
 */
export function createServiceSupabaseClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}
