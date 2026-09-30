import { z } from 'zod';
import type { ActionState } from '@/types/actions';
import { normalizeAccount, normalizeKeyword } from '@/lib/services/twitter/matching';

// Re-export ActionState as AlertState for backwards compatibility
export type AlertState = ActionState;

// Hard caps independent of the plan (plan caps are enforced in checkSocialAlertLimits).
export const MAX_KEYWORDS_HARD_CAP = 20;
export const MAX_KEYWORD_LENGTH = 60;

const X_HANDLE = /^[a-z0-9_]{1,15}$/;

export const accountSchema = z
  .string()
  .trim()
  .min(1, 'Account is required')
  .transform(normalizeAccount)
  .refine((v) => X_HANDLE.test(v), 'Invalid X handle (letters, digits, underscore, max 15)');

export const keywordsSchema = z
  .array(z.string().trim().min(1).max(MAX_KEYWORD_LENGTH))
  .min(1, 'At least one keyword is required')
  .max(MAX_KEYWORDS_HARD_CAP)
  .transform((list) => [
    ...new Set(list.map((k) => normalizeKeyword(k)).filter((k) => k.length > 0)),
  ]);

export const socialAlertSchema = z.object({
  account: accountSchema,
  keywords: keywordsSchema,
  platform: z.literal('twitter').default('twitter'),
  callEnabled: z.boolean().optional().default(true),
  sentimentFilter: z.enum(['bullish', 'bearish', 'neutral']).optional().nullable(),
  /** Premium only: also match replies and quote tweets (much higher volume, hence cost). */
  includeReplies: z.boolean().optional().default(false),
});

export const updateSocialAlertSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean().optional(),
  callEnabled: z.boolean().optional(),
  keywords: keywordsSchema.optional(),
  sentimentFilter: z.enum(['bullish', 'bearish', 'neutral']).optional().nullable(),
  includeReplies: z.boolean().optional(),
});
