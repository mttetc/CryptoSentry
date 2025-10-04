import { z } from 'zod';

// Only keep schemas that are actually used
export const messageRequestSchema = z.object({
  from: z
    .string()
    .regex(
      /^\+?[1-9]\d{1,14}$|^[A-Za-z0-9]{1,11}$/,
      'Must be an E.164 phone number or alphanumeric sender ID'
    ),
  messaging_profile_id: z.string().min(1, 'Messaging profile ID is required'),
  to: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Must be an E.164 phone number'),
  text: z.string().min(1, 'Message cannot be empty').max(1600, 'Message too long'),
  type: z.enum(['SMS', 'MMS']).default('SMS'),
  media_urls: z.array(z.string().url()).optional(),
  subject: z.string().optional(),
});

export const telnyxCallPayloadSchema = z.object({
  to: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Must be an E.164 phone number'),
  from: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Must be an E.164 phone number'),
  webhook_url: z.string().url(),
  record_audio: z.boolean(),
  timeout_secs: z.number().int().positive(),
  answering_machine_detection: z.enum(['basic', 'premium']),
  custom_headers: z.record(z.string(), z.string()),
  tts_voice: z.string(),
  tts_payload: z.string().min(1),
});
