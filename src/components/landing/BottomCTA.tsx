'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { fadeInUp } from './animations';

export default function BottomCTA() {
  return (
    <section className="relative border-t border-white/10 py-24">
      {/* Subtle glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[300px] w-[500px] rounded-full bg-sentry-green/5 blur-[100px]" />
      </div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
        variants={fadeInUp}
        className="relative mx-auto max-w-5xl px-6 text-center"
      >
        <h2 className="text-2xl font-semibold text-white md:text-3xl">
          Free to start. No credit card.
        </h2>
        <p className="mt-3 text-neutral-400">Set up your first alert in under a minute.</p>
        <div className="mt-8">
          <Link
            href="/auth?register=true"
            className="group inline-flex items-center gap-2 rounded-lg bg-sentry-green px-6 py-3 text-sm font-medium text-white shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all hover:bg-sentry-green/90 hover:shadow-[0_0_30px_rgba(34,197,94,0.4)]"
          >
            Get started
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
