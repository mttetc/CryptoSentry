-- Add 'exact' direction and recurring flag to price_alerts

-- Drop old CHECK constraint and add new one with 'exact'
ALTER TABLE public.price_alerts DROP CONSTRAINT IF EXISTS price_alerts_direction_check;
ALTER TABLE public.price_alerts ADD CONSTRAINT price_alerts_direction_check
  CHECK (direction IN ('above', 'below', 'exact'));

-- Add recurring column (default true for new alerts)
ALTER TABLE public.price_alerts ADD COLUMN IF NOT EXISTS recurring BOOLEAN NOT NULL DEFAULT true;

-- Add cooldown tracking for recurring alerts
ALTER TABLE public.price_alerts ADD COLUMN IF NOT EXISTS last_triggered_at TIMESTAMPTZ;
