import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { createServiceSupabaseClient } from '@/lib/supabase/server';

export class AuthError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * For server actions — throws AuthError on failure.
 * Returns a Supabase client (service role) and the authenticated userId.
 */
export async function requireAuth() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user.id) {
    throw new AuthError('Unauthorized');
  }

  const supabase = createServiceSupabaseClient();

  return { supabase, userId: session.user.id };
}

/**
 * For route handlers — accepts a NextRequest to support both cookies and Bearer tokens.
 */
export async function requireAuthFromRequest(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user.id) {
    throw new AuthError('Unauthorized');
  }

  const supabase = createServiceSupabaseClient();

  return { supabase, userId: session.user.id };
}

/**
 * For pages (RSC) — returns null session instead of throwing.
 */
export async function getOptionalSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const supabase = session?.user.id
    ? createServiceSupabaseClient()
    : null;

  return { supabase, session };
}
