'use client';

import { motion } from 'motion/react';
import { fadeInUp, staggerContainer } from './animations';

const steps = [
  {
    num: '01',
    title: 'Connect Telegram',
    desc: 'Open our Telegram bot and press Start. That\'s it, your account is linked.',
  },
  {
    num: '02',
    title: 'Pick accounts',
    desc: 'Add any public X handle you want to watch — influencers, whales, insiders.',
  },
  {
    num: '03',
    title: 'Set keywords',
    desc: 'Define tokens or phrases that matter to you. $PEPE, $SOL, "airdrop"...',
  },
  {
    num: '04',
    title: 'Get called',
    desc: 'When a keyword matches, Telegram calls you. Your phone rings for real.',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-16">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        className="mx-auto max-w-5xl px-6"
      >
        <motion.p variants={fadeInUp} className="mb-10 text-center font-mono text-sm uppercase tracking-widest text-neutral-400">
          How it works
        </motion.p>
        <div className="grid gap-x-12 gap-y-10 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <motion.div key={step.num} variants={fadeInUp}>
              <span className="font-mono text-sm text-sentry-green">{step.num}</span>
              <h3 className="mt-3 text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
