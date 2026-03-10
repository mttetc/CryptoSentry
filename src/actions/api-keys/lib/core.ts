'use server';

import { requireAuth } from '@/lib/api/auth';
import { checkFeatureAccess } from '@/lib/config/plans';
import { generateApiKey } from '@/lib/api/api-key-auth';
import { createApiKeySchema } from '../schemas';
import type { z } from 'zod';

// --- Types ---

interface CreateKeySuccess {
  success: true;
  key: string;
}

interface CreateKeyError {
  success: false;
  error: string;
}

interface ApiKeyListItem {
  id: string;
  prefix: string;
  name: string;
  scopes: string[];
  last_used_at: string | null;
  created_at: string;
  is_active: boolean;
}

interface ListKeysSuccess {
  success: true;
  keys: ApiKeyListItem[];
}

interface ListKeysError {
  success: false;
  error: string;
}

// --- Pure functions ---

function toError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

// --- Server actions ---

export async function createApiKey(
  input: z.input<typeof createApiKeySchema>
): Promise<CreateKeySuccess | CreateKeyError> {
  try {
    const { supabase, userId } = await requireAuth();

    // Premium feature check
    const access = await checkFeatureAccess(userId, 'api');
    if (!access.allowed) {
      return { success: false, error: access.error ?? 'API access not available' };
    }

    const validated = createApiKeySchema.parse(input);
    const { key, hash, prefix } = generateApiKey();

    const { error } = await supabase
      .from('api_keys')
      .insert({
        user_id: userId,
        key_hash: hash,
        key_prefix: prefix,
        name: validated.name,
        scopes: validated.scopes,
        rate_limit: 100,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Return the full key - it is only shown once
    return { success: true, key };
  } catch (error) {
    console.error('Failed to create API key:', error);
    return { success: false, error: toError(error, 'Failed to create API key') };
  }
}

export async function revokeApiKey(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, userId } = await requireAuth();

    const { data: existing } = await supabase
      .from('api_keys')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existing || existing.user_id !== userId) {
      return { success: false, error: 'API key not found' };
    }

    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to revoke API key:', error);
    return { success: false, error: toError(error, 'Failed to revoke API key') };
  }
}

export async function listApiKeys(): Promise<ListKeysSuccess | ListKeysError> {
  try {
    const { supabase, userId } = await requireAuth();

    const { data, error } = await supabase
      .from('api_keys')
      .select('id, key_prefix, name, scopes, last_used_at, created_at, is_active')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const keys: ApiKeyListItem[] = (data ?? []).map(
      (row: Record<string, unknown>) => ({
        id: String(row.id),
        prefix: String(row.key_prefix),
        name: String(row.name),
        scopes: row.scopes as string[],
        last_used_at: row.last_used_at as string | null,
        created_at: String(row.created_at),
        is_active: Boolean(row.is_active),
      })
    );

    return { success: true, keys };
  } catch (error) {
    console.error('Failed to list API keys:', error);
    return { success: false, error: toError(error, 'Failed to list API keys') };
  }
}
