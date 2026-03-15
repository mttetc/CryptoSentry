-- Fix nullable columns that should have NOT NULL + defaults

-- call_enabled: defaults to true, no reason to be null
UPDATE public.social_alerts SET call_enabled = true WHERE call_enabled IS NULL;
ALTER TABLE public.social_alerts ALTER COLUMN call_enabled SET DEFAULT true;
ALTER TABLE public.social_alerts ALTER COLUMN call_enabled SET NOT NULL;

-- created_at: should always be set via DEFAULT NOW()
UPDATE public.social_alerts SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE public.social_alerts ALTER COLUMN created_at SET NOT NULL;

UPDATE public.price_alerts SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE public.price_alerts ALTER COLUMN created_at SET NOT NULL;

UPDATE public.wallet_alerts SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE public.wallet_alerts ALTER COLUMN created_at SET NOT NULL;

UPDATE public.alert_triggers SET triggered_at = NOW() WHERE triggered_at IS NULL;
ALTER TABLE public.alert_triggers ALTER COLUMN triggered_at SET NOT NULL;

UPDATE public.user_portfolios SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE public.user_portfolios ALTER COLUMN created_at SET NOT NULL;
