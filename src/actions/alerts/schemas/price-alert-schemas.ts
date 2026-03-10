import { z } from 'zod';

export const priceAlertSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  coingeckoId: z.string().min(1, 'Coin selection is required'),
  targetPrice: z.number().positive('Price must be positive'),
  direction: z.enum(['above', 'below']),
});

export const updatePriceAlertSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean().optional(),
  targetPrice: z.number().positive().optional(),
  direction: z.enum(['above', 'below']).optional(),
});
