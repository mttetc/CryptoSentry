export const PRICING_TIERS = {
  starter: {
    name: 'Starter',
    price: 19,
    currency: 'USD',
    period: 'month',
    features: {
      accounts: 2,
      keywords: 5,
      alerts: ['telegram_voice', 'whatsapp_voice', 'email'],
      description: 'Perfect for individual traders',
    },
    limits: {
      maxAccounts: 2,
      maxKeywords: 5,
      maxAlerts: 10,
    },
  },
  pro: {
    name: 'Pro',
    price: 39,
    currency: 'USD',
    period: 'month',
    features: {
      accounts: 5,
      keywords: 15,
      alerts: ['telegram_voice', 'whatsapp_voice', 'sms', 'email'],
      description: 'For active traders and small teams',
    },
    limits: {
      maxAccounts: 5,
      maxKeywords: 15,
      maxAlerts: 25,
    },
  },
  enterprise: {
    name: 'Enterprise',
    price: 79,
    currency: 'USD',
    period: 'month',
    features: {
      accounts: 15,
      keywords: -1, // unlimited
      alerts: ['telegram_voice', 'whatsapp_voice', 'sms', 'email', 'priority_support'],
      description: 'For professional traders and teams',
    },
    limits: {
      maxAccounts: 15,
      maxKeywords: -1, // unlimited
      maxAlerts: 100,
    },
  },
} as const;

export type PricingTier = keyof typeof PRICING_TIERS;
export type AlertType = 'telegram_voice' | 'whatsapp_voice' | 'sms' | 'email' | 'priority_support';

export function getTierFeatures(tier: PricingTier) {
  return PRICING_TIERS[tier];
}

export function canUserAccessFeature(userTier: PricingTier, feature: AlertType): boolean {
  const tierFeatures = getTierFeatures(userTier);
  return tierFeatures.features.alerts.includes(feature);
}

export function canUserAddAccount(userTier: PricingTier, currentAccountCount: number): boolean {
  const tierLimits = getTierFeatures(userTier).limits;
  return tierLimits.maxAccounts === -1 || currentAccountCount < tierLimits.maxAccounts;
}

export function canUserAddKeyword(userTier: PricingTier, currentKeywordCount: number): boolean {
  const tierLimits = getTierFeatures(userTier).limits;
  return tierLimits.maxKeywords === -1 || currentKeywordCount < tierLimits.maxKeywords;
}
