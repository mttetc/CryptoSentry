'use client';

import NextLink from 'next/link';
import { m } from 'motion/react';
import { fadeInUp, staggerContainer } from './animations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { PLANS, PLAN_ORDER, describePlan, type PlanId } from '@/lib/config/plan-limits';

const PLAN_DESCRIPTIONS: Record<PlanId, string> = {
  free: 'Get started with basic monitoring',
  pro: 'For serious traders who need more coverage',
  premium: 'Maximum coverage, replies included, API access',
};

const plans = PLAN_ORDER.map((id) => {
  const limits = PLANS[id];
  return {
    id,
    name: limits.label,
    price: String(limits.priceEur),
    description: PLAN_DESCRIPTIONS[id],
    features: describePlan(id),
    cta: id === 'free' ? 'Get started' : 'Coming soon',
    href: '/auth?register=true',
    highlighted: id === 'pro',
  };
});

export default function PricingSection() {
  return (
    <section className="border-t py-24">
      <m.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        className="mx-auto max-w-5xl px-6"
      >
        <m.div variants={fadeInUp} className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Simple pricing</h2>
          <p className="text-muted-foreground mt-3">
            Start free. Upgrade when you need more accounts, keywords or matched tweets.
          </p>
        </m.div>

        <div className="mx-auto mt-12 grid max-w-4xl items-stretch gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <m.div key={plan.name} variants={fadeInUp}>
              <Card
                className={
                  plan.highlighted
                    ? 'border-primary/50 ring-primary/20 flex h-full flex-col ring-1'
                    : 'flex h-full flex-col'
                }
              >
                <CardHeader>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-semibold">{plan.price}&#8364;</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-muted-foreground mt-2 text-sm">{plan.description}</p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="text-primary h-4 w-4 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant="outline" className="w-full">
                    <NextLink href={plan.href}>{plan.cta}</NextLink>
                  </Button>
                </CardContent>
              </Card>
            </m.div>
          ))}
        </div>

        <m.p
          variants={fadeInUp}
          className="text-muted-foreground mx-auto mt-8 max-w-lg text-center text-xs"
        >
          Social alerts run on the official X API, billed per matched tweet. Plan quotas exist so we
          can keep that cost predictable.
        </m.p>
      </m.div>
    </section>
  );
}
