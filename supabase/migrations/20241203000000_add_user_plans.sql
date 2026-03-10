-- User plan/subscription tracking
-- Default: 'free' for all users (no row needed = free)

CREATE TABLE IF NOT EXISTS public.user_plans (
  user_id TEXT NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE PRIMARY KEY,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS handle_updated_at_user_plans ON public.user_plans;
CREATE TRIGGER handle_updated_at_user_plans
    BEFORE UPDATE ON public.user_plans
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own plan') THEN
    CREATE POLICY "Users can view own plan" ON public.user_plans
      FOR SELECT TO authenticated USING (user_id = current_setting('request.jwt.claim.sub', true));
  END IF;
END $$;
