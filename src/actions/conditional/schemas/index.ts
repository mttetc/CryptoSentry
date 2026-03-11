import { z } from 'zod';

const multiInfluencerConfigSchema = z.object({
  minInfluencers: z.number().int().min(2).default(3),
  tokenFilter: z.array(z.string()).optional(),
});

const volumeSpikeConfigSchema = z.object({
  symbol: z.string().min(1),
  multiplier: z.number().min(1.5).default(3),
});

const sentimentShiftConfigSchema = z.object({
  symbol: z.string().min(1),
  direction: z.enum(['negative', 'positive']),
  threshold: z.number().min(0.1).max(1).default(0.7),
});

export const conditionalRuleSchema = z.object({
  name: z.string().min(1).max(100),
  ruleType: z.enum(['multi_influencer', 'volume_spike', 'sentiment_shift']),
  config: z.union([
    multiInfluencerConfigSchema,
    volumeSpikeConfigSchema,
    sentimentShiftConfigSchema,
  ]),
  timeWindowMinutes: z.number().int().min(5).max(1440).default(60),
});

export const updateConditionalRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  config: z
    .union([
      multiInfluencerConfigSchema,
      volumeSpikeConfigSchema,
      sentimentShiftConfigSchema,
    ])
    .optional(),
  timeWindowMinutes: z.number().int().min(5).max(1440).optional(),
});
