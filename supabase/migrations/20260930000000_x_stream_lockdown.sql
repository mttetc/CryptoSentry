-- X filtered stream migration: persisted dedup, monthly usage lock, per-alert reply flag,
-- and schema fixes surfaced by the 2026-09-30 audit.

-- 1. Tweets already processed by the pipeline (survives restarts, prevents re-notification)
CREATE TABLE IF NOT EXISTS public.processed_tweets (
  tweet_id TEXT PRIMARY KEY,
  account TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_processed_tweets_processed_at ON public.processed_tweets(processed_at);

-- 2. Posts delivered by the X stream per UTC month (global cost lock)
CREATE TABLE IF NOT EXISTS public.x_stream_usage (
  month TEXT PRIMARY KEY, -- 'YYYY-MM' (UTC)
  delivered INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Atomic increment helper used by the stream provider
CREATE OR REPLACE FUNCTION public.increment_x_stream_usage(p_month TEXT, p_count INTEGER)
RETURNS INTEGER AS $$
DECLARE
  new_total INTEGER;
BEGIN
  INSERT INTO public.x_stream_usage (month, delivered, updated_at)
  VALUES (p_month, p_count, NOW())
  ON CONFLICT (month) DO UPDATE
    SET delivered = public.x_stream_usage.delivered + EXCLUDED.delivered,
        updated_at = NOW()
  RETURNING delivered INTO new_total;
  RETURN new_total;
END;
$$ LANGUAGE plpgsql;

-- 3. Per-alert opt-in for replies/quotes (Premium only, enforced in app code)
ALTER TABLE public.social_alerts ADD COLUMN IF NOT EXISTS include_replies BOOLEAN NOT NULL DEFAULT false;

-- 4. Legacy column from the pre-QR Telegram flow
ALTER TABLE public.social_alerts DROP COLUMN IF EXISTS telegram_conversation_id;

-- 5. Delivery logs: alert_id was NOT NULL but the pipeline had no UUID for legacy callers
ALTER TABLE public.alert_delivery_logs ALTER COLUMN alert_id DROP NOT NULL;

-- 6. Price triggers are linked through price_alert_id (alert_id FK points to social_alerts)
CREATE INDEX IF NOT EXISTS idx_alert_triggers_price_alert_id ON public.alert_triggers(price_alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_triggers_alert_id ON public.alert_triggers(alert_id);

-- 7. RLS on the new system tables (service role only; no user policies on purpose)
ALTER TABLE public.processed_tweets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.x_stream_usage ENABLE ROW LEVEL SECURITY;

-- 8. Features removed on 2026-09-30 (no monitoring backend / no downstream effect)
DROP TABLE IF EXISTS public.composite_condition_events;
DROP TABLE IF EXISTS public.composite_alerts;
DROP TABLE IF EXISTS public.conditional_rules;
DROP TABLE IF EXISTS public.influencer_events;
DROP TABLE IF EXISTS public.influencer_scores;
DROP TABLE IF EXISTS public.user_portfolios;
DROP TABLE IF EXISTS public.wallet_triggers;
DROP TABLE IF EXISTS public.wallet_alerts;
DROP TYPE IF EXISTS public.chain_type;
