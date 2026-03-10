import { z } from 'zod';
import type { ActionState } from '@/types/actions';

// Re-export ActionState as AlertState for backwards compatibility
export type AlertState = ActionState;

export const socialAlertSchema = z.object({
  account: z.string().min(1),
  keywords: z.array(z.string().min(1)),
  platform: z.string().default('twitter'),
  callEnabled: z.boolean().optional().default(true),
});

export const updateSocialAlertSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean().optional(),
  callEnabled: z.boolean().optional(),
  keywords: z.array(z.string().min(1)).optional(),
});
