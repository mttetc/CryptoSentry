-- Phase 2: Simplified Schema for CryptoSentry
-- Remove complex features, focus on core functionality

-- Drop unnecessary tables from previous phases
DROP TABLE IF EXISTS public.waitlist CASCADE;
DROP TABLE IF EXISTS public.user_whatsapp_settings CASCADE;
DROP TABLE IF EXISTS public.user_subscriptions CASCADE;
DROP TABLE IF EXISTS public.user_notification_settings CASCADE;

-- Keep only essential tables and simplify them

-- 1. User Telegram Settings (simplified)
CREATE TABLE IF NOT EXISTS public.user_telegram_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_username TEXT,
  telegram_chat_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'disconnected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Social Alerts (simplified)
CREATE TABLE IF NOT EXISTS public.social_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'twitter',
  account TEXT NOT NULL,
  keywords TEXT[] NOT NULL,
  telegram_conversation_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Alert Triggers (for tracking)
CREATE TABLE IF NOT EXISTS public.alert_triggers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES public.social_alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('social')),
  data JSONB NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Alert Delivery Logs (simplified)
CREATE TABLE IF NOT EXISTS public.alert_delivery_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('social')),
  channel TEXT NOT NULL CHECK (channel IN ('telegram')),
  message_id TEXT,
  data JSONB,
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_telegram_settings_user_id ON public.user_telegram_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_social_alerts_user_id ON public.social_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_alerts_is_active ON public.social_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_alert_triggers_user_id ON public.alert_triggers(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_triggers_triggered_at ON public.alert_triggers(triggered_at);
CREATE INDEX IF NOT EXISTS idx_alert_delivery_logs_user_id ON public.alert_delivery_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_delivery_logs_created_at ON public.alert_delivery_logs(created_at);

-- Enable Row Level Security
ALTER TABLE public.user_telegram_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_telegram_settings
CREATE POLICY "Users can view their own telegram settings" ON public.user_telegram_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own telegram settings" ON public.user_telegram_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own telegram settings" ON public.user_telegram_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for social_alerts
CREATE POLICY "Users can view their own social alerts" ON public.social_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own social alerts" ON public.social_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social alerts" ON public.social_alerts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social alerts" ON public.social_alerts
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for alert_triggers
CREATE POLICY "Users can view their own alert triggers" ON public.alert_triggers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert alert triggers" ON public.alert_triggers
  FOR INSERT WITH CHECK (true);

-- Create RLS policies for alert_delivery_logs
CREATE POLICY "Users can view their own delivery logs" ON public.alert_delivery_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert delivery logs" ON public.alert_delivery_logs
  FOR INSERT WITH CHECK (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_updated_at_user_telegram_settings
    BEFORE UPDATE ON public.user_telegram_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_social_alerts
    BEFORE UPDATE ON public.social_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
