import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export class AuthError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * For server actions and services — throws AuthError on failure.
 * Returns both the Better Auth session and a Supabase client for DB queries.
 */
export async function requireAuth() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user.id) {
    throw new AuthError('Unauthorized');
  }

  // Supabase client still used for DB queries (not auth)
  const supabase = await createServerSupabaseClient();

  return { supabase, userId: session.user.id };
}

/**
 * For route handlers — accepts a NextRequest to support both cookies and Bearer tokens.
 * Use this in API routes instead of requireAuth() which relies on next/headers.
 */
export async function requireAuthFromRequest(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user.id) {
    throw new AuthError('Unauthorized');
  }

  const supabase = await createServerSupabaseClient();

  return { supabase, userId: session.user.id };
}

/**
 * For pages (RSC) — returns null session instead of throwing.
 */
export async function getOptionalSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const supabase = await createServerSupabaseClient();

  return { supabase, session };
}
