'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { fadeInUp, staggerContainer } from './animations';
import HeroFeed from './HeroFeed';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pb-24 pt-32 md:pt-44">
      {/* Background glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2">
        <div className="h-[600px] w-[800px] rounded-full bg-sentry-green/5 blur-[120px]" />
      </div>

      <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-16 px-6 text-center lg:flex-row lg:items-start lg:gap-20 lg:text-left">
        {/* Left: Copy */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex max-w-lg flex-1 flex-col items-center lg:items-start"
        >
          <motion.h1
            variants={fadeInUp}
            className="text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl md:leading-tight"
          >
            Your phone rings
            <br />
            <span className="text-sentry-green">before Twitter loads.</span>
          </motion.h1>
          <motion.p
            variants={fadeInUp}
            className="mt-6 text-lg leading-relaxed text-neutral-400"
          >
            CryptoSentry watches crypto influencers on X and <strong className="text-white">calls you on Telegram</strong> when they mention a token you track. Your phone actually rings.
          </motion.p>
          <motion.div variants={fadeInUp} className="mt-8 flex items-center gap-4">
            <Link
              href="/auth?register=true"
              className="group inline-flex items-center gap-2 rounded-lg bg-sentry-green px-6 py-3 text-sm font-medium text-white shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all hover:bg-sentry-green/90 hover:shadow-[0_0_30px_rgba(34,197,94,0.4)]"
            >
              Set up your first alert
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
            </Link>
            <span className="text-xs text-neutral-500">Free &middot; No credit card</span>
          </motion.div>
        </motion.div>

        {/* Right: Animated feed */}
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
