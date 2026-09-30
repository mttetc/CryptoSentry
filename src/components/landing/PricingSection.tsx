'use client';

import NextLink from 'next/link';
import { m } from 'motion/react';
import { fadeInUp, staggerContainer, staggerRows } from './animations';
import { Button } from '@/components/ui/button';
import { PLANS, PLAN_ORDER, type PlanId, type PlanLimits } from '@/lib/config/plan-limits';

const ROWS: {
  label: string;
  value: (p: PlanLimits) => string;
  accent?: (p: PlanLimits) => boolean;
}[] = [
  { label: 'Alerts (social + price)', value: (p) => String(p.maxAlerts) },
  { label: 'X accounts watched', value: (p) => String(p.maxWatchedAccounts) },
  { label: 'Keywords per alert', value: (p) => String(p.maxKeywordsPerAlert) },
  { label: 'Matched tweets per month', value: (p) => p.monthlyTweetQuota.toLocaleString('en-US') },
  {
    label: 'Replies and quotes',
    value: (p) => (p.allowReplies ? 'included' : 'no'),
    accent: (p) => p.allowReplies,
  },
  { label: 'Channels', value: (p) => (p.channels.length === 1 ? 'Telegram' : 'all four') },
  { label: 'REST API', value: (p) => (p.hasApi ? 'included' : 'no'), accent: (p) => p.hasApi },
];

const CTA: Record<PlanId, string> = {
  free: 'Get started',
  pro: 'Coming soon',
  premium: 'Coming soon',
};

export default function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-20 py-24">
      <m.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        className="mx-auto flex max-w-6xl flex-col gap-12 px-6 lg:px-10"
      >
        <m.div
          variants={fadeInUp}
          className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="flex flex-col gap-3.5">
            <span className="text-primary font-mono text-xs tracking-[0.12em] uppercase">
              Pricing
            </span>
            <h2 className="font-display text-3xl leading-[1.05] font-semibold tracking-[-0.03em] md:text-[44px]">
              Pay for reach, not for seats.
            </h2>
          </div>
          <p className="text-ink-muted max-w-md text-[15px] leading-relaxed">
            Social alerts run on the official X API, billed per matched tweet. Quotas keep that
            predictable for you and for us.
          </p>
        </m.div>

        {/* One comparison table, hairlines only */}
        <m.div variants={fadeInUp} className="-mx-6 overflow-x-auto px-6 lg:mx-0 lg:px-0">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.1] align-bottom">
                <th scope="col" className="w-[28%] pb-6 font-normal" />
                {PLAN_ORDER.map((planId) => {
                  const plan = PLANS[planId];
                  const highlighted = planId === 'pro';
                  return (
                    <th key={planId} scope="col" className="pb-6 pl-6 font-normal">
                      <div className="flex flex-col gap-2">
                        <span
                          className={
                            highlighted
                              ? 'text-primary font-mono text-xs tracking-[0.08em] uppercase'
                              : 'text-ink-muted font-mono text-xs tracking-[0.08em] uppercase'
                          }
                        >
                          {plan.label}
                          {highlighted && ' · most picked'}
                        </span>
                        <span className="flex items-baseline gap-1.5">
                          <span className="font-display text-[40px] leading-none font-semibold tracking-[-0.03em]">
                            {plan.priceEur}€
                          </span>
                          <span className="text-ink-muted text-sm">/month</span>
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <m.tbody
              variants={staggerRows}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              className="font-mono text-[13px]"
            >
              {ROWS.map((row) => (
                <m.tr
                  key={row.label}
                  variants={fadeInUp}
                  className="border-b border-white/[0.08] transition-colors duration-200 hover:bg-white/[0.02]"
                >
                  <th
                    scope="row"
                    className="text-ink-muted py-3.5 pr-6 font-sans text-sm font-normal"
                  >
                    {row.label}
                  </th>
                  {PLAN_ORDER.map((planId) => {
                    const plan = PLANS[planId];
                    const accent = row.accent?.(plan) ?? false;
                    let tone = 'text-ink-soft';
                    if (accent) {
                      tone = 'text-primary';
                    } else if (planId === 'pro') {
                      tone = 'text-foreground';
                    }
                    return (
                      <td key={planId} className={`${tone} py-3.5 pl-6`}>
                        {row.value(plan)}
                      </td>
                    );
                  })}
                </m.tr>
              ))}
              <m.tr variants={fadeInUp}>
                <td className="pt-7" />
                {PLAN_ORDER.map((planId) => (
                  <td key={planId} className="pt-7 pl-6">
                    <Button
                      asChild
                      variant={planId === 'pro' ? 'default' : 'outline'}
                      className={planId === 'pro' ? 'h-11 w-full text-[#06110A]' : 'h-11 w-full'}
                    >
                      <NextLink href="/auth?register=true">{CTA[planId]}</NextLink>
                    </Button>
                  </td>
                ))}
              </m.tr>
            </m.tbody>
          </table>
        </m.div>
      </m.div>
    </section>
  );
}
