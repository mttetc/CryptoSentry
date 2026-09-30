'use client';

import NextLink from 'next/link';
import { m } from 'motion/react';
import { fadeInUp, staggerContainer } from './animations';
import { Button } from '@/components/ui/button';
import { PLANS, PLAN_ORDER, type PlanId } from '@/lib/config/plan-limits';

function rows(planId: PlanId): { label: string; value: string; accent?: boolean }[] {
  const p = PLANS[planId];
  const list: { label: string; value: string; accent?: boolean }[] = [
    { label: 'alerts', value: String(p.maxAlerts) },
    { label: 'X accounts', value: String(p.maxWatchedAccounts) },
    { label: 'keywords / alert', value: String(p.maxKeywordsPerAlert) },
    { label: 'matched tweets / mo', value: p.monthlyTweetQuota.toLocaleString('en-US') },
    { label: 'channels', value: p.channels.length === 1 ? 'Telegram' : 'all four' },
  ];
  if (p.allowReplies || p.hasApi) {
    list.push({ label: 'replies, quotes, API', value: 'included', accent: true });
  }
  return list;
}

const CTA: Record<PlanId, { label: string; href: string }> = {
  free: { label: 'Get started', href: '/auth?register=true' },
  pro: { label: 'Coming soon', href: '/auth?register=true' },
  premium: { label: 'Coming soon', href: '/auth?register=true' },
};

export default function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-20 py-24">
      <m.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        className="mx-auto flex max-w-6xl flex-col gap-11 px-6 lg:px-10"
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

        <div className="grid items-stretch gap-5 md:grid-cols-3">
          {PLAN_ORDER.map((planId) => {
            const plan = PLANS[planId];
            const highlighted = planId === 'pro';
            return (
              <m.div
                key={planId}
                variants={fadeInUp}
                className={
                  highlighted
                    ? 'relative flex flex-col gap-5 rounded-2xl border border-[rgba(34,197,94,0.45)] bg-[linear-gradient(180deg,#14201B_0%,#121918_100%)] p-7 shadow-[0_30px_80px_rgba(34,197,94,0.12)] md:-translate-y-4'
                    : 'bg-surface relative flex flex-col gap-5 rounded-2xl border border-white/[0.1] p-7'
                }
              >
                {highlighted && (
                  <span className="bg-primary absolute -top-3 left-7 rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold tracking-[0.06em] text-[#06110A]">
                    MOST PICKED
                  </span>
                )}
                <div className="flex flex-col gap-1.5">
                  <span className={highlighted ? 'text-primary text-sm' : 'text-ink-muted text-sm'}>
                    {plan.label}
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display text-[44px] font-semibold tracking-[-0.03em]">
                      {plan.priceEur}€
                    </span>
                    <span className="text-ink-muted text-sm">/month</span>
                  </div>
                </div>

                <div
                  className={
                    highlighted
                      ? 'flex flex-col font-mono text-[13px]'
                      : 'text-ink-soft flex flex-col font-mono text-[13px]'
                  }
                >
                  {rows(planId).map((row) => (
                    <div
                      key={row.label}
                      className="flex justify-between border-t border-white/[0.08] py-2.5 last:border-b"
                    >
                      <span className="text-ink-muted">{row.label}</span>
                      <span className={row.accent ? 'text-primary' : undefined}>{row.value}</span>
                    </div>
                  ))}
                </div>

                <Button
                  asChild
                  variant={highlighted ? 'default' : 'outline'}
                  className={highlighted ? 'mt-auto h-11 text-[#06110A]' : 'mt-auto h-11'}
                >
                  <NextLink href={CTA[planId].href}>{CTA[planId].label}</NextLink>
                </Button>
              </m.div>
            );
          })}
        </div>
      </m.div>
    </section>
  );
}
