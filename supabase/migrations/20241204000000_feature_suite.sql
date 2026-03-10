-- CryptoSentry Feature Suite Migration
-- Price alerts, notification channels, wallet alerts, influencer tracking,
-- portfolios, composite alerts, conditional rules, API keys

-- ============================================================
-- 1. New Tables
-- ============================================================

-- Price Alerts
CREATE TABLE IF NOT EXISTS public.price_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  coingecko_id TEXT NOT NULL,
  target_price NUMERIC NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('above', 'below')),
  is_active BOOLEAN DEFAULT true,
  triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification Channels
CREATE TABLE IF NOT EXISTS public.notification_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('telegram', 'email', 'discord', 'sms')),
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  alert_types TEXT[] DEFAULT ARRAY['social', 'price'],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, channel_type)
);

-- Wallet Alerts
CREATE TABLE IF NOT EXISTS public.wallet_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  label TEXT,
  chain TEXT NOT NULL CHECK (chain IN ('eth', 'sol')),
  min_value_usd NUMERIC NOT NULL DEFAULT 10000,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallet Triggers
CREATE TABLE IF NOT EXISTS public.wallet_triggers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_alert_id UUID NOT NULL REFERENCES public.wallet_alerts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  tx_hash TEXT NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  value_usd NUMERIC NOT NULL,
  token_symbol TEXT NOT NULL,
  data JSONB,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Influencer Scores (system-wide, no user_id)
CREATE TABLE IF NOT EXISTS public.influencer_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  avg_price_change_1h NUMERIC DEFAULT 0,
  avg_price_change_24h NUMERIC DEFAULT 0,
  positive_calls INTEGER DEFAULT 0,
  total_calls INTEGER DEFAULT 0,
  sample_count INTEGER DEFAULT 0,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(account, token_symbol)
);

-- Influencer Events (system-wide, readable by authenticated users)
CREATE TABLE IF NOT EXISTS public.influencer_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  tweet_id TEXT NOT NULL,
  price_at_mention NUMERIC NOT NULL,
  price_after_1h NUMERIC,
  price_after_24h NUMERIC,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Portfolios
CREATE TABLE IF NOT EXISTS public.user_portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  coingecko_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  avg_buy_price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

-- Composite Alerts
CREATE TABLE IF NOT EXISTS public.composite_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  conditions JSONB NOT NULL,
  time_window_minutes INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  last_evaluated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Composite Condition Events
CREATE TABLE IF NOT EXISTS public.composite_condition_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  composite_alert_id UUID NOT NULL REFERENCES public.composite_alerts(id) ON DELETE CASCADE,
  condition_index INTEGER NOT NULL,
  trigger_data JSONB NOT NULL,
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conditional Rules
CREATE TABLE IF NOT EXISTS public.conditional_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('multi_influencer', 'volume_spike', 'sentiment_shift')),
  config JSONB NOT NULL,
  time_window_minutes INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Keys
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['alerts:read'],
  rate_limit INTEGER NOT NULL DEFAULT 100,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Request Logs
CREATE TABLE IF NOT EXISTS public.api_request_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 2. ALTER existing tables
-- ============================================================

-- Add sentiment filter to social_alerts
ALTER TABLE public.social_alerts ADD COLUMN IF NOT EXISTS sentiment_filter TEXT CHECK (sentiment_filter IN ('bullish', 'bearish', 'neutral'));

-- Extend alert_triggers
ALTER TABLE public.alert_triggers ADD COLUMN IF NOT EXISTS sentiment TEXT;
ALTER TABLE public.alert_triggers ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE public.alert_triggers ADD COLUMN IF NOT EXISTS price_alert_id UUID REFERENCES public.price_alerts(id) ON DELETE CASCADE;

-- Make alert_id nullable (price triggers don't reference social_alerts)
ALTER TABLE public.alert_triggers ALTER COLUMN alert_id DROP NOT NULL;

-- Widen type check on alert_triggers
ALTER TABLE public.alert_triggers DROP CONSTRAINT IF EXISTS alert_triggers_type_check;
ALTER TABLE public.alert_triggers ADD CONSTRAINT alert_triggers_type_check CHECK (type IN ('social', 'price', 'whale', 'composite'));

-- Widen delivery logs type/channel checks
ALTER TABLE public.alert_delivery_logs DROP CONSTRAINT IF EXISTS alert_delivery_logs_type_check;
ALTER TABLE public.alert_delivery_logs ADD CONSTRAINT alert_delivery_logs_type_check CHECK (type IN ('social', 'price', 'whale', 'composite'));
ALTER TABLE public.alert_delivery_logs DROP CONSTRAINT IF EXISTS alert_delivery_logs_channel_check;
ALTER TABLE public.alert_delivery_logs ADD CONSTRAINT alert_delivery_logs_channel_check CHECK (channel IN ('telegram', 'email', 'discord', 'sms'));

-- Widen user_plans plan check to include premium
ALTER TABLE public.user_plans DROP CONSTRAINT IF EXISTS user_plans_plan_check;
ALTER TABLE public.user_plans ADD CONSTRAINT user_plans_plan_check CHECK (plan IN ('free', 'pro', 'premium'));

-- ============================================================
-- 3. Indexes
-- ============================================================

-- Price alerts
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON public.price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_is_active ON public.price_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_price_alerts_symbol ON public.price_alerts(symbol);

-- Notification channels
CREATE INDEX IF NOT EXISTS idx_notification_channels_user_id ON public.notification_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_channels_is_active ON public.notification_channels(is_active);

-- Wallet alerts
CREATE INDEX IF NOT EXISTS idx_wallet_alerts_user_id ON public.wallet_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_alerts_is_active ON public.wallet_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_wallet_alerts_address ON public.wallet_alerts(address);

-- Wallet triggers
CREATE INDEX IF NOT EXISTS idx_wallet_triggers_wallet_alert_id ON public.wallet_triggers(wallet_alert_id);
CREATE INDEX IF NOT EXISTS idx_wallet_triggers_user_id ON public.wallet_triggers(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_triggers_triggered_at ON public.wallet_triggers(triggered_at);

-- Influencer scores
CREATE INDEX IF NOT EXISTS idx_influencer_scores_account ON public.influencer_scores(account);
CREATE INDEX IF NOT EXISTS idx_influencer_scores_token_symbol ON public.influencer_scores(token_symbol);

-- Influencer events
CREATE INDEX IF NOT EXISTS idx_influencer_events_account ON public.influencer_events(account);
CREATE INDEX IF NOT EXISTS idx_influencer_events_processed ON public.influencer_events(processed);
CREATE INDEX IF NOT EXISTS idx_influencer_events_created_at ON public.influencer_events(created_at);

-- User portfolios
CREATE INDEX IF NOT EXISTS idx_user_portfolios_user_id ON public.user_portfolios(user_id);

-- Composite alerts
CREATE INDEX IF NOT EXISTS idx_composite_alerts_user_id ON public.composite_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_composite_alerts_is_active ON public.composite_alerts(is_active);

-- Composite condition events
CREATE INDEX IF NOT EXISTS idx_composite_condition_events_alert_id ON public.composite_condition_events(composite_alert_id);
CREATE INDEX IF NOT EXISTS idx_composite_condition_events_occurred_at ON public.composite_condition_events(occurred_at);

-- Conditional rules
CREATE INDEX IF NOT EXISTS idx_conditional_rules_user_id ON public.conditional_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_conditional_rules_is_active ON public.conditional_rules(is_active);

-- API keys
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON public.api_keys(is_active);

-- API request logs
CREATE INDEX IF NOT EXISTS idx_api_request_logs_api_key_id ON public.api_request_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_created_at ON public.api_request_logs(created_at);

-- ============================================================
-- 4. Updated_at triggers
-- ============================================================

DROP TRIGGER IF EXISTS handle_updated_at_price_alerts ON public.price_alerts;
CREATE TRIGGER handle_updated_at_price_alerts
    BEFORE UPDATE ON public.price_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_notification_channels ON public.notification_channels;
CREATE TRIGGER handle_updated_at_notification_channels
    BEFORE UPDATE ON public.notification_channels
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_wallet_alerts ON public.wallet_alerts;
CREATE TRIGGER handle_updated_at_wallet_alerts
    BEFORE UPDATE ON public.wallet_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_user_portfolios ON public.user_portfolios;
CREATE TRIGGER handle_updated_at_user_portfolios
    BEFORE UPDATE ON public.user_portfolios
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_composite_alerts ON public.composite_alerts;
CREATE TRIGGER handle_updated_at_composite_alerts
    BEFORE UPDATE ON public.composite_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_conditional_rules ON public.conditional_rules;
CREATE TRIGGER handle_updated_at_conditional_rules
    BEFORE UPDATE ON public.conditional_rules
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 5. Enable RLS
-- ============================================================

ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.composite_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.composite_condition_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conditional_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. RLS Policies
-- ============================================================

DO $$ BEGIN

  -- Price Alerts (user-owned CRUD)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own price alerts') THEN
    CREATE POLICY "Users can view own price alerts" ON public.price_alerts
      FOR SELECT TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own price alerts') THEN
    CREATE POLICY "Users can insert own price alerts" ON public.price_alerts
      FOR INSERT TO authenticated WITH CHECK (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own price alerts') THEN
    CREATE POLICY "Users can update own price alerts" ON public.price_alerts
      FOR UPDATE TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own price alerts') THEN
    CREATE POLICY "Users can delete own price alerts" ON public.price_alerts
      FOR DELETE TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;

  -- Notification Channels (user-owned CRUD)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own notification channels') THEN
    CREATE POLICY "Users can view own notification channels" ON public.notification_channels
      FOR SELECT TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own notification channels') THEN
    CREATE POLICY "Users can insert own notification channels" ON public.notification_channels
      FOR INSERT TO authenticated WITH CHECK (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own notification channels') THEN
    CREATE POLICY "Users can update own notification channels" ON public.notification_channels
      FOR UPDATE TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own notification channels') THEN
    CREATE POLICY "Users can delete own notification channels" ON public.notification_channels
      FOR DELETE TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;

  -- Wallet Alerts (user-owned CRUD)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own wallet alerts') THEN
    CREATE POLICY "Users can view own wallet alerts" ON public.wallet_alerts
      FOR SELECT TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own wallet alerts') THEN
    CREATE POLICY "Users can insert own wallet alerts" ON public.wallet_alerts
      FOR INSERT TO authenticated WITH CHECK (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own wallet alerts') THEN
    CREATE POLICY "Users can update own wallet alerts" ON public.wallet_alerts
      FOR UPDATE TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own wallet alerts') THEN
    CREATE POLICY "Users can delete own wallet alerts" ON public.wallet_alerts
      FOR DELETE TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;

  -- Wallet Triggers (user-owned read)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own wallet triggers') THEN
    CREATE POLICY "Users can view own wallet triggers" ON public.wallet_triggers
      FOR SELECT TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;

  -- Influencer Scores (system-wide, readable by all authenticated)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view influencer scores') THEN
    CREATE POLICY "Authenticated users can view influencer scores" ON public.influencer_scores
      FOR SELECT TO authenticated USING (true);
  END IF;

  -- Influencer Events (system-wide, readable by all authenticated)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view influencer events') THEN
    CREATE POLICY "Authenticated users can view influencer events" ON public.influencer_events
      FOR SELECT TO authenticated USING (true);
  END IF;

  -- User Portfolios (user-owned CRUD)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own portfolios') THEN
    CREATE POLICY "Users can view own portfolios" ON public.user_portfolios
      FOR SELECT TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own portfolios') THEN
    CREATE POLICY "Users can insert own portfolios" ON public.user_portfolios
      FOR INSERT TO authenticated WITH CHECK (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own portfolios') THEN
    CREATE POLICY "Users can update own portfolios" ON public.user_portfolios
      FOR UPDATE TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own portfolios') THEN
    CREATE POLICY "Users can delete own portfolios" ON public.user_portfolios
      FOR DELETE TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;

  -- Composite Alerts (user-owned CRUD)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own composite alerts') THEN
    CREATE POLICY "Users can view own composite alerts" ON public.composite_alerts
      FOR SELECT TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own composite alerts') THEN
    CREATE POLICY "Users can insert own composite alerts" ON public.composite_alerts
      FOR INSERT TO authenticated WITH CHECK (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own composite alerts') THEN
    CREATE POLICY "Users can update own composite alerts" ON public.composite_alerts
      FOR UPDATE TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own composite alerts') THEN
    CREATE POLICY "Users can delete own composite alerts" ON public.composite_alerts
      FOR DELETE TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;

  -- Composite Condition Events (readable via composite alert ownership)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own composite condition events') THEN
    CREATE POLICY "Users can view own composite condition events" ON public.composite_condition_events
      FOR SELECT TO authenticated
      USING (composite_alert_id IN (
        SELECT id FROM public.composite_alerts
        WHERE user_id = current_setting('request.jwt.claim.sub', true)
      ));
  END IF;

  -- Conditional Rules (user-owned CRUD)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own conditional rules') THEN
    CREATE POLICY "Users can view own conditional rules" ON public.conditional_rules
      FOR SELECT TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own conditional rules') THEN
    CREATE POLICY "Users can insert own conditional rules" ON public.conditional_rules
      FOR INSERT TO authenticated WITH CHECK (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own conditional rules') THEN
    CREATE POLICY "Users can update own conditional rules" ON public.conditional_rules
      FOR UPDATE TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own conditional rules') THEN
    CREATE POLICY "Users can delete own conditional rules" ON public.conditional_rules
      FOR DELETE TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;

  -- API Keys (user-owned CRUD)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own api keys') THEN
    CREATE POLICY "Users can view own api keys" ON public.api_keys
      FOR SELECT TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own api keys') THEN
    CREATE POLICY "Users can insert own api keys" ON public.api_keys
      FOR INSERT TO authenticated WITH CHECK (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own api keys') THEN
    CREATE POLICY "Users can update own api keys" ON public.api_keys
      FOR UPDATE TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own api keys') THEN
    CREATE POLICY "Users can delete own api keys" ON public.api_keys
      FOR DELETE TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;

  -- API Request Logs (readable via api key ownership)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own api request logs') THEN
    CREATE POLICY "Users can view own api request logs" ON public.api_request_logs
      FOR SELECT TO authenticated
      USING (api_key_id IN (
        SELECT id FROM public.api_keys
        WHERE user_id = current_setting('request.jwt.claim.sub', true)
      ));
  END IF;

END $$;
