-- Per-user accounting of posts delivered by the X stream (what X actually bills), replacing
-- the trigger-count approximation, plus an index for the monthly SMS quota lookup.

CREATE TABLE IF NOT EXISTS public.user_stream_usage (
  month TEXT NOT NULL, -- 'YYYY-MM' (UTC)
  user_id TEXT NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  delivered INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (month, user_id)
);

-- One call per batch of delivered posts: p_rows = [{"user_id": "...", "delivered": 2}, ...]
CREATE OR REPLACE FUNCTION public.increment_user_stream_usage(p_month TEXT, p_rows JSONB)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_stream_usage (month, user_id, delivered, updated_at)
  SELECT p_month, r.user_id, r.delivered, NOW()
  FROM jsonb_to_recordset(p_rows) AS r(user_id TEXT, delivered INTEGER)
  ON CONFLICT (month, user_id) DO UPDATE
    SET delivered = public.user_stream_usage.delivered + EXCLUDED.delivered,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

ALTER TABLE public.user_stream_usage ENABLE ROW LEVEL SECURITY;

-- Monthly SMS quota: count successful SMS deliveries per user
CREATE INDEX IF NOT EXISTS idx_alert_delivery_logs_user_channel_created
  ON public.alert_delivery_logs(user_id, channel, created_at);
