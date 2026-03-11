import { z } from 'zod';

const socialConditionSchema = z.object({
  type: z.literal('social'),
  account: z.string().min(1),
  keywords: z.array(z.string()).min(1),
});

const priceConditionSchema = z.object({
  type: z.literal('price'),
  symbol: z.string().min(1),
  direction: z.enum(['above', 'below']),
  targetPrice: z.number().positive(),
});

const whaleConditionSchema = z.object({
  type: z.literal('whale'),
  chain: z.enum(['eth', 'sol']),
  minValueUsd: z.number().positive(),
});

const conditionSchema = z.discriminatedUnion('type', [
  socialConditionSchema,
  priceConditionSchema,
  whaleConditionSchema,
]);

export const compositeAlertSchema = z.object({
  name: z.string().min(1).max(100),
  conditions: z.array(conditionSchema).min(2, 'At least 2 conditions required'),
  timeWindowMinutes: z.number().int().min(5).max(1440).default(60),
});

export const updateCompositeAlertSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  conditions: z
    .array(conditionSchema)
    .min(2, 'At least 2 conditions required')
    .optional(),
  timeWindowMinutes: z.number().int().min(5).max(1440).optional(),
});
