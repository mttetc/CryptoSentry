-- CryptoSentry App Tables
-- Compatible with Better Auth (user.id is TEXT, no Supabase Auth dependency)
-- RLS enforced via custom JWT: Better Auth userId → request.jwt.claim.sub
-- Service role key bypasses RLS for system operations (pipeline, webhooks)

-- 1. User Telegram Settings
CREATE TABLE IF NOT EXISTS public.user_telegram_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  telegram_username TEXT,
  telegram_chat_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'disconnected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Social Alerts
CREATE TABLE IF NOT EXISTS public.social_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'twitter',
  account TEXT NOT NULL,
  keywords TEXT[] NOT NULL,
  telegram_conversation_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Alert Triggers (tracking)
CREATE TABLE IF NOT EXISTS public.alert_triggers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES public.social_alerts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('social')),
  data JSONB NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Alert Delivery Logs
CREATE TABLE IF NOT EXISTS public.alert_delivery_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL,
  user_id TEXT NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('social')),
  channel TEXT NOT NULL CHECK (channel IN ('telegram')),
  message_id TEXT,
  data JSONB,
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_telegram_settings_user_id ON public.user_telegram_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_social_alerts_user_id ON public.social_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_alerts_is_active ON public.social_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_alert_triggers_user_id ON public.alert_triggers(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_triggers_triggered_at ON public.alert_triggers(triggered_at);
CREATE INDEX IF NOT EXISTS idx_alert_delivery_logs_user_id ON public.alert_delivery_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_delivery_logs_created_at ON public.alert_delivery_logs(created_at);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_updated_at_user_telegram_settings ON public.user_telegram_settings;
CREATE TRIGGER handle_updated_at_user_telegram_settings
    BEFORE UPDATE ON public.user_telegram_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_social_alerts ON public.social_alerts;
CREATE TRIGGER handle_updated_at_social_alerts
    BEFORE UPDATE ON public.social_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.user_telegram_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_delivery_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users access own data via JWT sub claim
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own social alerts') THEN
    CREATE POLICY "Users can view own social alerts" ON public.social_alerts
      FOR SELECT TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own social alerts') THEN
    CREATE POLICY "Users can insert own social alerts" ON public.social_alerts
      FOR INSERT TO authenticated WITH CHECK (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own social alerts') THEN
    CREATE POLICY "Users can update own social alerts" ON public.social_alerts
      FOR UPDATE TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own social alerts') THEN
    CREATE POLICY "Users can delete own social alerts" ON public.social_alerts
      FOR DELETE TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own alert triggers') THEN
    CREATE POLICY "Users can view own alert triggers" ON public.alert_triggers
      FOR SELECT TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own telegram settings') THEN
    CREATE POLICY "Users can manage own telegram settings" ON public.user_telegram_settings
      FOR ALL TO authenticated
      USING (user_id = current_setting('request.jwt.claim.sub', true))
      WITH CHECK (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own delivery logs') THEN
    CREATE POLICY "Users can view own delivery logs" ON public.alert_delivery_logs
      FOR SELECT TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
END $$;
