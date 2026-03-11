import { z } from 'zod';

export const portfolioPositionSchema = z.object({
  symbol: z.string().min(1),
  coingeckoId: z.string().min(1),
  amount: z.number().positive(),
  avgBuyPrice: z.number().positive(),
});

export const updatePositionSchema = z.object({
  id: z.string().uuid(),
  amount: z.number().positive().optional(),
  avgBuyPrice: z.number().positive().optional(),
});
