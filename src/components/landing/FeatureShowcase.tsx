'use client';

import { m } from 'motion/react';
import { Activity, Bot, TrendingUp, ListFilter, LayoutGrid, Code2 } from 'lucide-react';
import { fadeInUp, staggerContainer } from './animations';

const features = [
  {
    icon: Activity,
    title: 'Real-time X monitoring',
    desc: 'Official filtered stream, one persistent connection, rules synced within seconds of you saving an alert. No polling, no rate-limit roulette.',
  },
  {
    icon: Bot,
    title: 'AI sentiment, per tweet',
    desc: 'Bullish, bearish or neutral plus a one-line summary. Filter an alert to bullish only and skip the rest.',
  },
  {
    icon: TrendingUp,
    title: 'Price alerts on Binance',
    desc: 'Above, below or exact crossing. Fires once and disarms, or recurring on each crossing. Evaluated server-side, dashboard open or not.',
    amber: true,
  },
  {
    icon: ListFilter,
    title: 'Word-level matching',
    desc: '"eth" never matches "method", "sol" never matches "solution". Cashtags, hashtags and multi-word phrases understood.',
  },
  {
    icon: LayoutGrid,
    title: 'Every channel you already use',
    desc: 'Telegram for speed. Discord webhooks for your group. Email and SMS when it really matters. Route by alert type.',
  },
  {
    icon: Code2,
    title: 'REST API',
    desc: 'Read your alerts and triggers from your own bots and scripts. Scoped keys, rate limited, Premium.',
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
        className="mx-auto flex max-w-6xl flex-col gap-12 px-6 lg:px-10"
      >
        <m.div variants={fadeInUp} className="flex max-w-3xl flex-col gap-3.5">
          <span className="text-primary font-mono text-xs tracking-[0.12em] uppercase">
            What is in the box
          </span>
          <h2 className="font-display text-3xl leading-[1.05] font-semibold tracking-[-0.03em] md:text-[44px]">
            Built for people who trade the news, not the noise.
          </h2>
        </m.div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <m.div
                key={feature.title}
                variants={fadeInUp}
                className="bg-surface flex min-h-[200px] flex-col gap-3.5 rounded-2xl border border-white/[0.1] p-7"
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={
                      feature.amber ? 'text-amber h-5.5 w-5.5' : 'text-primary h-5.5 w-5.5'
                    }
                  />
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                </div>
                <p className="text-ink-muted text-sm leading-relaxed">{feature.desc}</p>
              </m.div>
            );
          })}
        </div>
      </m.div>
    </section>
  );
}
