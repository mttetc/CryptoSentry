import { z } from 'zod';

export const walletAlertSchema = z.object({
  address: z.string().min(1, 'Wallet address is required'),
  label: z.string().optional(),
  chain: z.enum(['eth', 'sol']),
  minValueUsd: z.number().positive('Minimum value must be positive').default(10_000),
});

export const updateWalletAlertSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean().optional(),
  label: z.string().optional(),
  minValueUsd: z.number().positive().optional(),
});
