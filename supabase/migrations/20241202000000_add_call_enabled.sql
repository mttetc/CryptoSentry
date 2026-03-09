-- Add call_enabled column to social_alerts
ALTER TABLE public.social_alerts
  ADD COLUMN IF NOT EXISTS call_enabled BOOLEAN DEFAULT true;
