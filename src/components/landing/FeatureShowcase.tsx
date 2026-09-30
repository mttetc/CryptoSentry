'use client';

import { m } from 'motion/react';
import { fadeInUp, staggerRows } from './animations';
import { SectionHeading } from './SectionHeading';
import {
  ApiArt,
  BoundaryArt,
  ChannelsArt,
  PriceArt,
  SentimentArt,
  StreamArt,
} from './illustrations';
import { ChartArt } from './chart-art';
import type { ComponentType } from 'react';

const features: {
  title: string;
  desc: string;
  meta: string;
  amber?: boolean;
  art: ComponentType<{ className?: string }>;
}[] = [
  {
    art: StreamArt,
    title: 'Real-time X monitoring',
    desc: 'Official filtered stream, one persistent connection, rules synced within seconds of you saving an alert. No polling, no rate-limit roulette.',
    meta: 'push · official API',
  },
  {
    art: SentimentArt,
    title: 'AI sentiment, per tweet',
    desc: 'Bullish, bearish or neutral plus a one-line summary. Filter an alert to bullish only and skip the rest.',
    meta: 'bullish / bearish / neutral',
  },
  {
    art: PriceArt,
    title: 'Price alerts on Binance',
    desc: 'Above, below or exact crossing. Fires once and disarms, or recurring on each crossing. Evaluated server-side, dashboard open or not.',
    meta: 'websocket · server-side',
    amber: true,
  },
  {
    art: BoundaryArt,
    title: 'Word-level matching',
    desc: '"eth" never matches "method", "sol" never matches "solution". Cashtags, hashtags and multi-word phrases understood.',
    meta: '$sol · #btc · "spot etf"',
  },
  {
    art: ChannelsArt,
    title: 'Every channel you already use',
    desc: 'Telegram for speed. Discord webhooks for your group. Email and SMS when it really matters. Route by alert type.',
    meta: 'telegram · discord · email · sms',
  },
  {
    art: ApiArt,
    title: 'REST API',
    desc: 'Read your alerts and triggers from your own bots and scripts. Scoped keys, rate limited.',
    meta: 'premium',
  },
];

export default function FeatureShowcase() {
  return (
    <section id="features" className="bg-ground-2 scroll-mt-20 border-y border-white/[0.08] py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-12 lg:gap-8 lg:px-10">
        <div className="flex flex-col gap-10 lg:sticky lg:top-28 lg:col-span-4 lg:self-start">
          <SectionHeading
            eyebrow="What is in the box"
            title="Built for people who trade the news, not the noise."
            layout="stack"
            standalone
          />
          {/* The move the signal announced: the chart draws itself, the last candle goes green */}
          <m.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            className="hidden lg:block"
          >
            <ChartArt className="h-auto w-full" />
            <p className="text-ink-muted mt-3 font-mono text-xs">
              the tweet lands · the candle follows
            </p>
          </m.div>
        </div>

        {/* Spec sheet: hairline rows, index + title left, description right */}
        <m.dl
          variants={staggerRows}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="m-0 flex flex-col lg:col-span-8"
        >
          {features.map((feature, i) => {
            const Art = feature.art;
            return (
              <m.div
                key={feature.title}
                variants={fadeInUp}
                className="group grid gap-3 border-t border-white/[0.1] py-6 transition-colors duration-300 last:border-b hover:border-white/[0.22] md:grid-cols-12 md:gap-8"
              >
                <dt className="flex items-center gap-4 md:col-span-5">
                  <span className="text-ink-muted group-hover:text-primary font-mono text-xs transition-colors duration-300">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <Art className="group-hover:text-foreground transition-colors duration-300" />
                  <span className="text-[17px] font-semibold transition-transform duration-300 group-hover:translate-x-1">
                    {feature.title}
                  </span>
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
              </m.div>
            );
          })}
        </m.dl>
      </div>
    </section>
  );
}
