import { z } from 'zod';

export const emailChannelConfigSchema = z.object({
  address: z.string().email(),
});

export const discordChannelConfigSchema = z.object({
  webhook_url: z.string().url().startsWith('https://discord.com/api/webhooks/'),
});

export const smsChannelConfigSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format'),
});

export const addChannelSchema = z.object({
  channelType: z.enum(['email', 'discord', 'sms']),
  config: z.record(z.string(), z.unknown()),
  alertTypes: z.array(z.enum(['social', 'price', 'whale', 'composite'])).optional(),
});

export const updateChannelSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  alertTypes: z.array(z.enum(['social', 'price', 'whale', 'composite'])).optional(),
});
