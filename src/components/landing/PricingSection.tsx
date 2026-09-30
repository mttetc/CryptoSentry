'use client';

import NextLink from 'next/link';
import { m } from 'motion/react';
import { fadeInUp, staggerContainer } from './animations';
import { SectionHeading } from './SectionHeading';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { PLANS, PLAN_ORDER, type PlanId, type PlanLimits } from '@/lib/config/plan-limits';

interface Row {
  label: string;
  value: (p: PlanLimits) => string;
  accent?: (p: PlanLimits) => boolean;
}

const ROWS: Row[] = [
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
  {
    label: 'SMS per month',
    value: (p) => (p.monthlySmsQuota === 0 ? 'no' : String(p.monthlySmsQuota)),
  },
  { label: 'REST API', value: (p) => (p.hasApi ? 'included' : 'no'), accent: (p) => p.hasApi },
];

const CTA: Record<PlanId, string> = {
  free: 'Get started',
  pro: 'Coming soon',
  premium: 'Coming soon',
};

const HIGHLIGHTED: PlanId = 'pro';

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
        <SectionHeading
          eyebrow="Pricing"
          title="Pay for reach, not for seats."
          lede="Social alerts run on the official X API, billed per matched tweet. Quotas keep that predictable for you and for us."
        />

        {/* Phones: one stacked block per plan, same rows, no horizontal scroll */}
        <m.div variants={fadeInUp} className="flex flex-col gap-10 md:hidden">
          {PLAN_ORDER.map((planId) => {
            const plan = PLANS[planId];
            const highlighted = planId === HIGHLIGHTED;
            return (
              <div key={planId} className="flex flex-col gap-5">
                <div className="flex items-end justify-between">
                  <div className="flex flex-col gap-1.5">
                    <span
                      className={cn(
                        'font-mono text-xs tracking-[0.08em] uppercase',
                        highlighted ? 'text-primary' : 'text-ink-muted'
                      )}
                    >
                      {plan.label}
                      {highlighted && ' · most picked'}
                    </span>
                    <span className="flex items-baseline gap-1.5">
                      <span className="font-display text-[36px] leading-none font-semibold tracking-[-0.03em]">
                        {plan.priceEur}€
                      </span>
                      <span className="text-ink-muted text-sm">/month</span>
                    </span>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant={highlighted ? 'default' : 'outline'}
                    className={cn(highlighted && 'text-[#06110A]')}
                  >
                    <NextLink href="/auth?register=true">{CTA[planId]}</NextLink>
                  </Button>
                </div>
                <dl className="m-0 flex flex-col font-mono text-[13px]">
                  {ROWS.map((row) => {
                    const accent = row.accent?.(plan) ?? false;
                    return (
                      <div
                        key={row.label}
                        className="flex items-center justify-between gap-4 border-t border-white/[0.08] py-2.5 last:border-b"
                      >
                        <dt className="text-ink-muted font-sans text-sm">{row.label}</dt>
                        <dd className={cn('m-0', accent ? 'text-primary' : 'text-ink-soft')}>
                          {row.value(plan)}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            );
          })}
        </m.div>

        {/* Tablet and up: one comparison table */}
        <m.div variants={fadeInUp} className="hidden md:block">
          <Table className="min-w-[640px] table-fixed">
            <TableHeader>
              <TableRow className="border-white/[0.1] align-bottom hover:bg-transparent">
                <TableHead className="w-[28%] pb-6" />
                {/* With table-layout fixed, the three plan columns share the remaining width equally */}
                {PLAN_ORDER.map((planId) => {
                  const plan = PLANS[planId];
                  const highlighted = planId === HIGHLIGHTED;
                  return (
                    <TableHead key={planId} className="h-auto pb-6 pl-6 align-bottom">
                      <div className="flex flex-col gap-2">
                        <span
                          className={cn(
                            'font-mono text-xs tracking-[0.08em] uppercase',
                            highlighted ? 'text-primary' : 'text-ink-muted'
                          )}
                        >
                          {plan.label}
                          {highlighted && ' · most picked'}
                        </span>
                        <span className="flex items-baseline gap-1.5">
                          <span className="font-display text-foreground text-[40px] leading-none font-semibold tracking-[-0.03em]">
                            {plan.priceEur}€
                          </span>
                          <span className="text-ink-muted text-sm font-normal">/month</span>
                        </span>
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody className="font-mono text-[13px]">
              {ROWS.map((row) => (
                <TableRow key={row.label} className="border-white/[0.08] hover:bg-white/[0.02]">
                  <TableCell className="text-ink-muted py-3.5 pr-6 font-sans text-sm">
                    {row.label}
                  </TableCell>
                  {PLAN_ORDER.map((planId) => {
                    const plan = PLANS[planId];
                    const accent = row.accent?.(plan) ?? false;
                    return (
                      <TableCell
                        key={planId}
                        className={cn(
                          'py-3.5 pl-6',
                          accent && 'text-primary',
                          !accent && planId === HIGHLIGHTED && 'text-foreground',
                          !accent && planId !== HIGHLIGHTED && 'text-ink-soft'
                        )}
                      >
                        {row.value(plan)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
              <TableRow className="border-0 hover:bg-transparent">
                <TableCell className="pt-7" />
                {PLAN_ORDER.map((planId) => (
                  <TableCell key={planId} className="pt-7 pl-6">
                    <Button
                      asChild
                      variant={planId === HIGHLIGHTED ? 'default' : 'outline'}
                      className={cn('h-11 w-full', planId === HIGHLIGHTED && 'text-[#06110A]')}
                    >
                      <NextLink href="/auth?register=true">{CTA[planId]}</NextLink>
                    </Button>
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </m.div>
      </m.div>
    </section>
  );
}
