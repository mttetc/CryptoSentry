'use client';

import { m } from 'motion/react';
import { fadeInUp, staggerContainer } from './animations';

const features = [
  {
    title: 'Real-time X monitoring',
    desc: 'Official filtered stream, one persistent connection, rules synced within seconds of you saving an alert. No polling, no rate-limit roulette.',
    meta: 'push · official API',
  },
  {
    title: 'AI sentiment, per tweet',
    desc: 'Bullish, bearish or neutral plus a one-line summary. Filter an alert to bullish only and skip the rest.',
    meta: 'bullish / bearish / neutral',
  },
  {
    title: 'Price alerts on Binance',
    desc: 'Above, below or exact crossing. Fires once and disarms, or recurring on each crossing. Evaluated server-side, dashboard open or not.',
    meta: 'websocket · server-side',
    amber: true,
  },
  {
    title: 'Word-level matching',
    desc: '"eth" never matches "method", "sol" never matches "solution". Cashtags, hashtags and multi-word phrases understood.',
    meta: '$sol · #btc · "spot etf"',
  },
  {
    title: 'Every channel you already use',
    desc: 'Telegram for speed. Discord webhooks for your group. Email and SMS when it really matters. Route by alert type.',
    meta: 'telegram · discord · email · sms',
  },
  {
    title: 'REST API',
    desc: 'Read your alerts and triggers from your own bots and scripts. Scoped keys, rate limited.',
    meta: 'premium',
  },
];

export default function FeatureShowcase() {
  return (
    <section id="features" className="bg-ground-2 scroll-mt-20 border-y border-white/[0.08] py-24">
      <m.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-12 lg:gap-8 lg:px-10"
      >
        <m.div variants={fadeInUp} className="flex flex-col gap-3.5 lg:col-span-4">
          <span className="text-primary font-mono text-xs tracking-[0.12em] uppercase">
            What is in the box
          </span>
          <h2 className="font-display text-3xl leading-[1.05] font-semibold tracking-[-0.03em] md:text-[40px]">
            Built for people who trade the news, not the noise.
          </h2>
        </m.div>

        {/* Spec sheet: hairline rows, index + title left, description right */}
        <m.dl variants={fadeInUp} className="m-0 flex flex-col lg:col-span-8">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="grid gap-2 border-t border-white/[0.1] py-6 last:border-b md:grid-cols-12 md:gap-8"
            >
              <dt className="flex items-baseline gap-4 md:col-span-5">
                <span className="text-ink-muted font-mono text-xs">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[17px] font-semibold">{feature.title}</span>
              </dt>
              <dd className="m-0 flex flex-col gap-2 md:col-span-7">
                <p className="text-ink-muted m-0 text-sm leading-relaxed">{feature.desc}</p>
                <span
                  className={
                    feature.amber
                      ? 'text-amber font-mono text-xs'
                      : 'text-primary font-mono text-xs'
                  }
                >
                  {feature.meta}
                </span>
              </dd>
            </div>
          ))}
        </m.dl>
      </m.div>
    </section>
  );
}
