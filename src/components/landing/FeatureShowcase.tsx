'use client';

import { motion } from 'motion/react';
import { fadeInUp, staggerContainer } from './animations';

export default function FeatureShowcase() {
  return (
    <section className="border-t border-white/10 py-24">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        className="mx-auto flex max-w-5xl flex-col items-center gap-16 px-6 lg:flex-row"
      >
        {/* Mockup card — Telegram call simulation */}
        <motion.div
          variants={fadeInUp}
          className="relative w-full max-w-sm"
        >
          {/* Glow behind card */}
          <div className="absolute -inset-4 rounded-2xl bg-sentry-green/5 blur-2xl" />
          <div className="relative rounded-xl border border-white/10 bg-[#111111] p-6">
            <div className="space-y-5">
              <div>
                <label className="text-xs uppercase tracking-wider text-neutral-500">Account</label>
                <div className="mt-1 font-mono text-sm text-white">@CryptoGems</div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-neutral-500">Keywords</label>
                <div className="mt-1 flex gap-2">
                  <span className="rounded bg-sentry-green/15 px-2 py-0.5 font-mono text-sm text-sentry-green">
                    $PEPE
                  </span>
                  <span className="rounded bg-sentry-green/15 px-2 py-0.5 font-mono text-sm text-sentry-green">
                    $SOL
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-sentry-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                  </svg>
                  <label className="text-xs uppercase tracking-wider text-neutral-500">Telegram Call</label>
                </div>
                <div className="flex h-6 w-10 items-center rounded-full bg-sentry-green p-0.5">
                  <div className="h-5 w-5 translate-x-4 rounded-full bg-white" />
                </div>
              </div>
            </div>

            {/* Simulated incoming call overlay */}
            <div className="mt-5 rounded-lg border border-sentry-green/20 bg-sentry-green/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sentry-green/20">
                  <svg className="h-5 w-5 text-sentry-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">CryptoSentry</p>
                  <p className="text-xs text-sentry-green">Incoming call...</p>
                </div>
                <div className="h-3 w-3 animate-pulse rounded-full bg-sentry-green" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Copy */}
        <motion.div variants={fadeInUp} className="flex-1 text-center lg:text-left">
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            Why a call,
            <br />
            <span className="text-sentry-green">not a notification?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-neutral-400 lg:mx-0">
            Notifications get buried or muted. A Telegram voice call rings through Do Not Disturb, plays on your headphones or car speakers, and takes under 30 seconds from tweet to ring.
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
