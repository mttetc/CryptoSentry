'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/api/auth';
import { checkFeatureAccess } from '@/lib/config/plans';
import { portfolioPositionSchema, updatePositionSchema } from '../schemas';
import type { z } from 'zod';
import type { ActionState } from '@/types/actions';

// --- Pure functions ---

function buildPositionRow(userId: string, validated: z.infer<typeof portfolioPositionSchema>) {
  return {
    user_id: userId,
    symbol: validated.symbol,
    binance_symbol: validated.binanceSymbol,
    amount: validated.amount,
    avg_buy_price: validated.avgBuyPrice,
  };
}

function buildUpdateData(validated: z.infer<typeof updatePositionSchema>): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (validated.amount !== undefined) {
    data.amount = validated.amount;
  }
  if (validated.avgBuyPrice !== undefined) {
    data.avg_buy_price = validated.avgBuyPrice;
  }
  return data;
}

function toActionError(error: unknown, fallback: string): ActionState {
  return {
    success: false,
    error: error instanceof Error ? error.message : fallback,
  };
}

// --- Server actions ---

export async function addPosition(
  input: z.input<typeof portfolioPositionSchema>
): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireAuth();

    // Premium feature check
    const access = await checkFeatureAccess(userId, 'portfolio');
    if (!access.allowed) {
      return { success: false, error: access.error };
    }

    const validated = portfolioPositionSchema.parse(input);

    const { error } = await supabase
      .from('user_portfolios')
      .insert(buildPositionRow(userId, validated))
      .select()
      .single();

    if (error) {
      throw error;
    }

    revalidatePath('/settings/portfolio');
    return { success: true };
  } catch (error) {
    console.error('Failed to add portfolio position:', error);
    return toActionError(error, 'Failed to add portfolio position');
  }
}

export async function updatePosition(
  input: z.infer<typeof updatePositionSchema>
): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireAuth();
    const validated = updatePositionSchema.parse(input);

    const { data: existing } = await supabase
      .from('user_portfolios')
      .select('user_id')
      .eq('id', validated.id)
      .single();

    if (!existing || existing.user_id !== userId) {
      return { success: false, error: 'Position not found' };
    }

    const updateData = buildUpdateData(validated);
    if (Object.keys(updateData).length === 0) {
      return { success: true };
    }

    const { error } = await supabase
      .from('user_portfolios')
      .update(updateData)
      .eq('id', validated.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    revalidatePath('/settings/portfolio');
    return { success: true };
  } catch (error) {
    console.error('Failed to update portfolio position:', error);
    return toActionError(error, 'Failed to update portfolio position');
  }
}

export async function removePosition(id: string): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireAuth();

    const { data: existing } = await supabase
      .from('user_portfolios')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existing || existing.user_id !== userId) {
      return { success: false, error: 'Position not found' };
    }

    const { error } = await supabase.from('user_portfolios').delete().eq('id', id);

    if (error) {
      throw error;
    }

    revalidatePath('/settings/portfolio');
    return { success: true };
  } catch (error) {
    console.error('Failed to remove portfolio position:', error);
    return toActionError(error, 'Failed to remove portfolio position');
  }
}

export async function getPortfolio(): Promise<ActionState & { positions?: unknown[] }> {
  try {
    const { supabase, userId } = await requireAuth();

    const { data, error } = await supabase
      .from('user_portfolios')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return { success: true, positions: data ?? [] };
  } catch (error) {
    console.error('Failed to fetch portfolio:', error);
    return toActionError(error, 'Failed to fetch portfolio');
  }
}
