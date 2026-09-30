import { createServiceSupabaseClient } from '@/lib/supabase/server';
import { normalizeAccount } from '@/lib/services/twitter/matching';
import {
  PLANS,
  getPlanLimits,
  type PlanId,
  type PlanLimits,
  type ChannelType,
} from './plan-limits';

export { PLANS, getPlanLimits };
export type { PlanId, PlanLimits, ChannelType };

// --- DB helpers ---

function toPlanId(value: string | null | undefined): PlanId {
  return value && value in PLANS ? (value as PlanId) : 'free';
}

export async function getUserPlan(userId: string): Promise<PlanId> {
  const supabase = createServiceSupabaseClient();
  const { data } = await supabase
    .from('user_plans')
    .select('plan')
    .eq('user_id', userId)
    .maybeSingle();

  return toPlanId(data?.plan);
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

async function getUserWatchedAccounts(userId: string): Promise<Set<string>> {
  const supabase = createServiceSupabaseClient();
  const { data } = await supabase
    .from('social_alerts')
    .select('account')
    .eq('user_id', userId)
    .eq('is_active', true);

  return new Set((data ?? []).map((row) => normalizeAccount(row.account)));
}

function startOfUtcMonth(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** Matched tweets delivered for this user this UTC month (one alert_triggers row per alert × tweet). */
export async function getUserMonthlyTweetCount(userId: string): Promise<number> {
  const supabase = createServiceSupabaseClient();
  const { count } = await supabase
    .from('alert_triggers')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', 'social')
    .gte('triggered_at', startOfUtcMonth());

  return count ?? 0;
}

// --- Limit checks ---

interface LimitCheck {
  allowed: boolean;
  error?: string;
  plan: PlanId;
  usage: number;
  limit: number;
}

function upgradeHint(limits: PlanLimits): string {
  return limits.label === 'Premium' ? '' : ' Upgrade for more.';
}

export async function checkAlertLimit(userId: string): Promise<LimitCheck> {
  const [plan, usage] = await Promise.all([getUserPlan(userId), getUserAlertCount(userId)]);
  const limits = getPlanLimits(plan);

  return {
    allowed: usage < limits.maxAlerts,
    error:
      usage >= limits.maxAlerts
        ? `You've reached the ${limits.label} plan limit of ${limits.maxAlerts} alerts.${upgradeHint(limits)}`
        : undefined,
    plan,
    usage,
    limit: limits.maxAlerts,
  };
}

/**
 * Everything that makes a social alert cost money on the X stream:
 * total alerts, distinct watched accounts, keywords per alert, replies opt-in.
 * Called on creation AND on re-activation (limits only count active alerts).
 */
export async function checkSocialAlertLimits(
  userId: string,
  input: { account: string; keywords: string[]; includeReplies: boolean }
): Promise<{ allowed: boolean; error?: string; plan: PlanId }> {
  const [plan, usage, watched] = await Promise.all([
    getUserPlan(userId),
    getUserAlertCount(userId),
    getUserWatchedAccounts(userId),
  ]);
  const limits = getPlanLimits(plan);
  const hint = upgradeHint(limits);

  if (usage >= limits.maxAlerts) {
    return {
      allowed: false,
      plan,
      error: `You've reached the ${limits.label} plan limit of ${limits.maxAlerts} alerts.${hint}`,
    };
  }

  if (input.keywords.length > limits.maxKeywordsPerAlert) {
    return {
      allowed: false,
      plan,
      error: `The ${limits.label} plan allows ${limits.maxKeywordsPerAlert} keywords per alert.${hint}`,
    };
  }

  const account = normalizeAccount(input.account);
  if (!watched.has(account) && watched.size >= limits.maxWatchedAccounts) {
    return {
      allowed: false,
      plan,
      error: `The ${limits.label} plan allows watching ${limits.maxWatchedAccounts} X ${limits.maxWatchedAccounts === 1 ? 'account' : 'accounts'}.${hint}`,
    };
  }

  if (input.includeReplies && !limits.allowReplies) {
    return {
      allowed: false,
      plan,
      error: 'Including replies and quotes requires the Premium plan.',
    };
  }

  return { allowed: true, plan };
}

/** Notification channels are a plan feature (Free = Telegram only). */
export async function checkChannelAccess(
  userId: string,
  channelType: string
): Promise<{ allowed: boolean; error?: string; plan: PlanId }> {
  const plan = await getUserPlan(userId);
  const limits = getPlanLimits(plan);
  const allowed = limits.channels.includes(channelType as ChannelType);

  return {
    allowed,
    plan,
    error: allowed
      ? undefined
      : `The ${limits.label} plan only delivers to ${limits.channels.join(', ')}.${upgradeHint(limits)}`,
  };
}

/** Channels the user's plan is allowed to deliver to. */
export async function getAllowedChannels(userId: string): Promise<ChannelType[]> {
  return getPlanLimits(await getUserPlan(userId)).channels;
}

/**
 * Users whose monthly matched-tweet quota is exhausted. Their alerts are excluded from the X
 * rules and from matching until the next UTC month so we stop paying for posts we will not
 * deliver. One exact count query per user: PostgREST would silently truncate a row scan at
 * its 1000-row default and make Premium quotas unreachable.
 */
export async function getUsersOverTweetQuota(userIds: string[]): Promise<Set<string>> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) {
    return new Set();
  }

  const supabase = createServiceSupabaseClient();
  const since = startOfUtcMonth();

  const { data: planRows } = await supabase
    .from('user_plans')
    .select('user_id, plan')
    .in('user_id', unique);
  const planByUser = new Map((planRows ?? []).map((row) => [row.user_id, toPlanId(row.plan)]));

  const over = new Set<string>();
  const CONCURRENCY = 10;

  for (let i = 0; i < unique.length; i += CONCURRENCY) {
    const batch = unique.slice(i, i + CONCURRENCY);
    const counts = await Promise.all(
      batch.map((userId) =>
        supabase
          .from('alert_triggers')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('type', 'social')
          .gte('triggered_at', since)
      )
    );

    batch.forEach((userId, index) => {
      const limits = getPlanLimits(planByUser.get(userId) ?? 'free');
      if ((counts[index].count ?? 0) >= limits.monthlyTweetQuota) {
        over.add(userId);
      }
    });
  }

  return over;
}

type PremiumFeature = 'api';

interface FeatureCheck {
  allowed: boolean;
  error?: string;
  plan: PlanId;
}

export async function checkFeatureAccess(
  userId: string,
  feature: PremiumFeature
): Promise<FeatureCheck> {
  const plan = await getUserPlan(userId);
  const limits = getPlanLimits(plan);

  const featureMap: Record<PremiumFeature, boolean> = {
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
