/**
 * Pure plan definitions. Safe to import from client components (no server deps).
 *
 * Every limit below maps to a real cost driver on the X filtered stream, which bills
 * each delivered post (~$0.005). Watched accounts and keywords define the rules we push
 * to X; the monthly tweet quota caps how many matched posts a user can consume before
 * their alerts are paused until the next UTC month.
 */

export type PlanId = 'free' | 'pro' | 'premium';

export type ChannelType = 'telegram' | 'email' | 'discord' | 'sms';

export interface PlanLimits {
  label: string;
  priceEur: number;
  /** Social + price alerts combined. */
  maxAlerts: number;
  /** Distinct X accounts a user may watch across all social alerts. */
  maxWatchedAccounts: number;
  /** Keywords per social alert (each keyword widens the X rule, hence the cost). */
  maxKeywordsPerAlert: number;
  /** Matched tweets delivered for this user per UTC month before alerts pause. */
  monthlyTweetQuota: number;
  /** Whether replies and quote tweets may be included (much higher volume). */
  allowReplies: boolean;
  channels: ChannelType[];
  hasApi: boolean;
}

export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    label: 'Free',
    priceEur: 0,
    maxAlerts: 2,
    maxWatchedAccounts: 1,
    maxKeywordsPerAlert: 3,
    monthlyTweetQuota: 40,
    allowReplies: false,
    channels: ['telegram'],
    hasApi: false,
  },
  pro: {
    label: 'Pro',
    priceEur: 9,
    maxAlerts: 10,
    maxWatchedAccounts: 5,
    maxKeywordsPerAlert: 10,
    monthlyTweetQuota: 500,
    allowReplies: false,
    channels: ['telegram', 'email', 'discord', 'sms'],
    hasApi: false,
  },
  premium: {
    label: 'Premium',
    priceEur: 29,
    maxAlerts: 50,
    maxWatchedAccounts: 25,
    maxKeywordsPerAlert: 20,
    monthlyTweetQuota: 3000,
    allowReplies: true,
    channels: ['telegram', 'email', 'discord', 'sms'],
    hasApi: true,
  },
} as const;

export const PLAN_ORDER: PlanId[] = ['free', 'pro', 'premium'];

export function getPlanLimits(plan: PlanId): PlanLimits {
  return PLANS[plan];
}

/** Human-readable feature bullets derived from the limits (single source of truth for the landing). */
export function describePlan(plan: PlanId): string[] {
  const limits = PLANS[plan];
  const features = [
    `${limits.maxAlerts} alerts (social + price)`,
    `${limits.maxWatchedAccounts} X ${limits.maxWatchedAccounts === 1 ? 'account' : 'accounts'} watched`,
    `${limits.maxKeywordsPerAlert} keywords per alert`,
    `${limits.monthlyTweetQuota.toLocaleString('en-US')} matched tweets / month`,
    limits.channels.length === 1 ? 'Telegram notifications' : 'All notification channels',
  ];
  if (limits.allowReplies) {
    features.push('Replies & quotes included');
  }
  if (limits.hasApi) {
    features.push('REST API access');
  }
  return features;
}
