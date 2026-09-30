'use client';

import NextLink from 'next/link';
import { m } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { fadeInUp } from './animations';
import { Button } from '@/components/ui/button';

export default function BottomCTA() {
  return (
    <section className="relative border-t border-white/[0.08] py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 50% 80% at 50% 100%, rgba(34,197,94,0.14), transparent 70%)',
        }}
      />
      <m.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
        variants={fadeInUp}
        className="relative mx-auto flex max-w-6xl flex-col items-start gap-8 px-6 lg:px-10"
      >
        <h2 className="font-display max-w-3xl text-[40px] leading-[0.98] font-semibold tracking-[-0.035em] md:text-[64px]">
          Stop refreshing X.
          <br />
          <span className="text-ink-muted">Let the tweet come to you.</span>
        </h2>
        <div className="flex flex-wrap items-center gap-5">
          <Button asChild size="lg" className="h-13 gap-2.5 px-6 text-base text-[#06110A]">
            <NextLink href="/auth?register=true">
              Set up your first alert
              <ArrowRight className="h-4 w-4" />
            </NextLink>
          </Button>
          <span className="text-ink-muted font-mono text-xs">
            Free plan · no card · t.me/CryptoSentryBot
          </span>
        </div>
      </m.div>
    </section>
  );
}
