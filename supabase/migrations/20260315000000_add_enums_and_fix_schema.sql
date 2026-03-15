-- Convert CHECK constraints to proper enums for type generation

-- 1. Chain enum for wallet_alerts
DO $$ BEGIN
  CREATE TYPE public.chain_type AS ENUM ('eth', 'sol');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.wallet_alerts DROP CONSTRAINT IF EXISTS wallet_alerts_chain_check;
ALTER TABLE public.wallet_alerts
  ALTER COLUMN chain TYPE public.chain_type USING chain::text::public.chain_type;

-- 2. Direction enum for price_alerts
DO $$ BEGIN
  CREATE TYPE public.price_direction AS ENUM ('above', 'below', 'exact');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.price_alerts DROP CONSTRAINT IF EXISTS price_alerts_direction_check;
ALTER TABLE public.price_alerts
  ALTER COLUMN direction TYPE public.price_direction USING direction::text::public.price_direction;

-- 3. Fix influencer schema drift
ALTER TABLE public.influencer_scores ADD COLUMN IF NOT EXISTS correct_calls INTEGER DEFAULT 0;
ALTER TABLE public.influencer_scores ADD COLUMN IF NOT EXISTS accuracy NUMERIC DEFAULT 0;
ALTER TABLE public.influencer_scores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.influencer_events ADD COLUMN IF NOT EXISTS scored BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_influencer_events_scored ON public.influencer_events(scored);

-- 4. Ensure NOT NULL defaults are correct
ALTER TABLE public.social_alerts ALTER COLUMN is_active SET DEFAULT true;
ALTER TABLE public.social_alerts ALTER COLUMN is_active SET NOT NULL;
ALTER TABLE public.price_alerts ALTER COLUMN is_active SET DEFAULT true;
ALTER TABLE public.price_alerts ALTER COLUMN is_active SET NOT NULL;
ALTER TABLE public.wallet_alerts ALTER COLUMN is_active SET DEFAULT true;
ALTER TABLE public.wallet_alerts ALTER COLUMN is_active SET NOT NULL;
