import { z } from 'zod';
import type { ActionState } from '@/types/actions';

export const alertConditionSchema = z.enum(['above', 'below', 'between', 'change']);
export const logicOperatorSchema = z.enum(['AND', 'OR']);

export const assetConditionSchema = z.object({
  symbol: z.string().min(1),
  condition: alertConditionSchema,
  value: z.number(),
  value2: z.number().optional(),
});

export const alertTypeSchema = z.enum(['price', 'social']);

export type AlertCondition = z.infer<typeof alertConditionSchema>;
export type LogicOperator = z.infer<typeof logicOperatorSchema>;
export type AssetCondition = z.infer<typeof assetConditionSchema>;
export type AlertType = z.infer<typeof alertTypeSchema>;

// Re-export ActionState as AlertState for backwards compatibility
export type AlertState = ActionState;

export { initialActionState as initialAlertState } from '@/types/actions';

export const priceAlertSchema = z.object({
  symbol: z.string().min(1),
  targetPrice: z.number().positive(),
  condition: z.enum(['above', 'below']),
});

export const socialAlertSchema = z.object({
  account: z.string().min(1),
  keywords: z.array(z.string().min(1)),
  platform: z.string().default('twitter'),
  telegramConversationId: z.string().optional(),
});

export const updateSocialAlertSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean().optional(),
  keywords: z.array(z.string().min(1)).optional(),
  telegramConversationId: z.string().min(1).optional(),
});

export const alertDeliveryLogSchema = z.object({
  alert_id: z.string(),
  user_id: z.string(),
  type: z.enum(['price', 'social']),
  channel: z.enum(['sms', 'call', 'telegram']),
  message_id: z.string(),
  data: z.record(z.string(), z.any()),
});

export type AlertDeliveryLog = z.infer<typeof alertDeliveryLogSchema>;
