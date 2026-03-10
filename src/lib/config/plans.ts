import { createServiceSupabaseClient } from '@/lib/supabase/server';

// --- Plan definitions ---

export type PlanId = 'free' | 'pro';

interface PlanLimits {
  maxAlerts: number;
  label: string;
}

const PLANS: Record<PlanId, PlanLimits> = {
  free: { maxAlerts: 2, label: 'Free' },
  pro: { maxAlerts: 10, label: 'Pro' },
} as const;

export function getPlanLimits(plan: PlanId): PlanLimits {
  return PLANS[plan];
}

// --- DB helpers ---

export async function getUserPlan(userId: string): Promise<PlanId> {
  const supabase = createServiceSupabaseClient();
  const { data } = await supabase.from('user_plans').select('plan').eq('user_id', userId).single();

  return (data?.plan as PlanId) ?? 'free';
}

export async function getUserAlertCount(userId: string): Promise<number> {
  const supabase = createServiceSupabaseClient();
  const { count } = await supabase
    .from('social_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true);

  return count ?? 0;
}

interface LimitCheck {
  allowed: boolean;
  error?: string;
  plan: PlanId;
  usage: number;
  limit: number;
}

export async function checkAlertLimit(userId: string): Promise<LimitCheck> {
  const [plan, usage] = await Promise.all([getUserPlan(userId), getUserAlertCount(userId)]);

  const limits = getPlanLimits(plan);

  return {
    allowed: usage < limits.maxAlerts,
    error:
      usage >= limits.maxAlerts
        ? `You've reached the ${limits.label} plan limit of ${limits.maxAlerts} alerts. Upgrade to Pro for more.`
        : undefined,
    plan,
    usage,
    limit: limits.maxAlerts,
  };
}
