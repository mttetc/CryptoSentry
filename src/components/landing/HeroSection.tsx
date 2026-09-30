'use client';

import NextLink from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { fadeInUp, revealUp, staggerContainer, hoverLift } from './animations';
import HeroFeed from './HeroFeed';
import { HeroChartArt } from './illustrations';
import { Button } from '@/components/ui/button';

function Dot() {
  return <span className="h-1 w-1 rounded-full bg-[#3B4A43]" />;
}

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-32 pb-24 md:pt-36 md:pb-28">
      {/* Animated chart along the bottom of the first screen */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[240px] [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)] opacity-60 md:block"
      >
        <HeroChartArt />
      </div>
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-12 lg:gap-8 lg:px-10">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-start gap-7 lg:col-span-6"
        >
          <motion.div
            variants={fadeInUp}
            className="text-primary inline-flex items-center gap-2.5 rounded-full border border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.08)] py-1.5 pr-3 pl-2 font-mono text-xs"
          >
            <span className="relative flex h-2 w-2">
              <span className="bg-primary/60 animate-sentry-ping absolute inline-flex h-full w-full rounded-full" />
              <span className="bg-primary relative inline-flex h-2 w-2 rounded-full" />
            </span>
            Official X filtered stream · live
          </motion.div>

          <h1 className="font-display text-[44px] leading-[0.98] font-semibold tracking-[-0.035em] md:text-[64px] lg:text-[72px]">
            <motion.span variants={revealUp} className="block">
              Get the tweet
            </motion.span>
            <motion.span variants={revealUp} className="block">
              before the candle.
            </motion.span>
          </h1>

          <motion.p variants={fadeInUp} className="text-ink-muted max-w-lg text-lg leading-relaxed">
            Pick the X accounts and keywords that move your bags. CryptoSentry streams every
            matching post to your Telegram in seconds, with an AI read on the sentiment. Nothing
            else gets through.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-wrap items-center gap-4">
            <motion.div {...hoverLift}>
              <Button
                asChild
                size="lg"
                className="group h-13 gap-2.5 px-6 text-base text-[#06110A] shadow-[0_0_0_1px_rgba(34,197,94,0.4),0_12px_40px_rgba(34,197,94,0.25)] transition-shadow hover:shadow-[0_0_0_1px_rgba(34,197,94,0.6),0_16px_48px_rgba(34,197,94,0.35)]"
              >
                <NextLink href="/auth?register=true">
                  Set up your first alert
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </NextLink>
              </Button>
            </motion.div>
            <motion.div {...hoverLift}>
              <Button asChild size="lg" variant="outline" className="h-13 px-5 text-[15px]">
                <a href="#how">See how it works</a>
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="text-ink-muted flex items-center gap-4 font-mono text-xs"
          >
            <span>Free plan</span>
            <Dot />
            <span>No card</span>
            <Dot />
            <span>1-minute setup</span>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 6 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{ perspective: 1200 }}
          className="relative w-full lg:col-span-6"
        >
          <HeroFeed />
        </motion.div>
      </div>
    </section>
  );
}
