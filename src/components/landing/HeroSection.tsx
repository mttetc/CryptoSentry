'use client';

import NextLink from 'next/link';
import { motion } from 'motion/react';
import { fadeInUp, staggerContainer } from './animations';
import HeroFeed from './HeroFeed';
import { Button } from '@/components/ui/button';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pb-24 pt-32 md:pt-44">
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2">
        <div className="h-[600px] w-[800px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-16 px-6 text-center lg:flex-row lg:items-start lg:gap-20 lg:text-left">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex max-w-lg flex-1 flex-col items-center lg:items-start"
        >
          <motion.h1
            variants={fadeInUp}
            className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl md:leading-tight"
          >
            Your phone rings
            <br />
            <span className="text-primary">before Twitter loads.</span>
          </motion.h1>
          <motion.p
            variants={fadeInUp}
            className="mt-6 text-lg leading-relaxed text-muted-foreground"
          >
            CryptoSentry watches crypto influencers on X and <strong className="text-foreground">calls you on Telegram</strong> when they mention a token you track. Your phone actually rings.
          </motion.p>
          <motion.div variants={fadeInUp} className="mt-8 flex items-center gap-4">
            <Button asChild size="lg">
              <NextLink href="/auth?register=true">
                Set up your first alert &rarr;
              </NextLink>
            </Button>
            <span className="text-xs text-muted-foreground">Free &middot; No credit card</span>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full max-w-md flex-shrink-0"
        >
          <HeroFeed />
        </motion.div>
      </div>
    </section>
  );
}
