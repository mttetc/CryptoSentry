import { z } from 'zod';
import type { ActionState } from '@/types/actions';

// Re-export ActionState as AlertState for backwards compatibility
export type AlertState = ActionState;

export const socialAlertSchema = z.object({
  account: z.string().min(1),
  keywords: z.array(z.string().min(1)),
  platform: z.string().default('twitter'),
  telegramConversationId: z.string().optional(),
  callEnabled: z.boolean().default(true),
});

export const updateSocialAlertSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean().optional(),
  keywords: z.array(z.string().min(1)).optional(),
  telegramConversationId: z.string().min(1).optional(),
});
