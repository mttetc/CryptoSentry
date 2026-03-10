import { createServiceSupabaseClient } from '@/lib/supabase/server';

// --- Plan definitions ---

export type PlanId = 'free' | 'pro' | 'premium';

type ChannelType = 'telegram' | 'email' | 'discord' | 'sms';

interface PlanLimits {
  maxAlerts: number;
  maxWalletAlerts: number;
  channels: ChannelType[];
  hasPortfolio: boolean;
  hasComposite: boolean;
  hasApi: boolean;
  label: string;
}

const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    maxAlerts: 2,
    maxWalletAlerts: 0,
    channels: ['telegram'],
    hasPortfolio: false,
    hasComposite: false,
    hasApi: false,
    label: 'Free',
  },
  pro: {
    maxAlerts: 10,
    maxWalletAlerts: 5,
    channels: ['telegram', 'email', 'discord', 'sms'],
    hasPortfolio: false,
    hasComposite: false,
    hasApi: false,
    label: 'Pro',
  },
  premium: {
    maxAlerts: 50,
    maxWalletAlerts: 20,
    channels: ['telegram', 'email', 'discord', 'sms'],
    hasPortfolio: true,
    hasComposite: true,
    hasApi: true,
    label: 'Premium',
  },
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

  const [socialResult, priceResult] = await Promise.all([
    supabase
      .from('social_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true),
    supabase
      .from('price_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true),
  ]);

  return (socialResult.count ?? 0) + (priceResult.count ?? 0);
}

async function getUserWalletAlertCount(userId: string): Promise<number> {
  const supabase = createServiceSupabaseClient();
  const { count } = await supabase
    .from('wallet_alerts')
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
        ? `You've reached the ${limits.label} plan limit of ${limits.maxAlerts} alerts. Upgrade for more.`
        : undefined,
    plan,
    usage,
    limit: limits.maxAlerts,
  };
}

export async function checkWalletAlertLimit(userId: string): Promise<LimitCheck> {
  const [plan, usage] = await Promise.all([getUserPlan(userId), getUserWalletAlertCount(userId)]);

  const limits = getPlanLimits(plan);

  return {
    allowed: usage < limits.maxWalletAlerts,
    error:
      usage >= limits.maxWalletAlerts
        ? `You've reached the ${limits.label} plan limit of ${limits.maxWalletAlerts} wallet alerts. Upgrade for more.`
        : undefined,
    plan,
    usage,
    limit: limits.maxWalletAlerts,
  };
}

type PremiumFeature = 'portfolio' | 'composite' | 'api';

interface FeatureCheck {
  allowed: boolean;
  error?: string;
  plan: PlanId;
}

export async function checkFeatureAccess(
  userId: string,
  feature: PremiumFeature,
): Promise<FeatureCheck> {
  const plan = await getUserPlan(userId);
  const limits = getPlanLimits(plan);

  const featureMap: Record<PremiumFeature, boolean> = {
    portfolio: limits.hasPortfolio,
    composite: limits.hasComposite,
    api: limits.hasApi,
  };

  const allowed = featureMap[feature];

  return {
    allowed,
    error: allowed
      ? undefined
      : `The ${feature} feature requires a Premium plan. You are on the ${limits.label} plan.`,
    plan,
  };
}
