'use client';

import NextLink from 'next/link';
import { m } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { fadeInUp } from './animations';
import { Button } from '@/components/ui/button';

export default function BottomCTA() {
  return (
    <section className="pb-24">
      <m.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
        variants={fadeInUp}
        className="mx-auto max-w-6xl px-6 lg:px-10"
      >
        <div className="bg-surface flex flex-col gap-6 overflow-hidden rounded-[20px] border border-[rgba(34,197,94,0.3)] bg-[radial-gradient(ellipse_60%_120%_at_20%_50%,rgba(34,197,94,0.18),transparent_70%)] px-8 py-10 md:flex-row md:items-center md:justify-between md:px-14">
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-[28px] font-semibold tracking-[-0.03em] md:text-[34px]">
              Stop refreshing X.
            </h2>
            <p className="text-ink-muted text-[15px]">
              Free plan, no card, first alert live in under a minute.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-ink-muted font-mono text-xs">t.me/CryptoSentryBot</span>
            <Button asChild size="lg" className="h-13 gap-2.5 px-6 text-base text-[#06110A]">
              <NextLink href="/auth?register=true">
                Set up your first alert
                <ArrowRight className="h-4 w-4" />
              </NextLink>
            </Button>
          </div>
        </div>
      </m.div>
    </section>
  );
}
