'use client';

import { m } from 'motion/react';
import { fadeInUp } from './animations';

const facts = [
  'Official X API, no scraping',
  'Push delivery in seconds',
  'Telegram, Discord, email, SMS',
  'Binance prices over WebSocket',
];

export default function StatsBar() {
  return (
    <m.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.5 }}
      variants={fadeInUp}
      className="bg-ground-2/60 border-y border-white/[0.08]"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-6 py-6 sm:grid-cols-2 lg:grid-cols-4 lg:px-10">
        {facts.map((fact, i) => (
          <div key={fact} className="text-ink-soft flex items-center gap-3 text-sm">
            <span className="text-primary font-mono">{String(i + 1).padStart(2, '0')}</span>
            {fact}
          </div>
        ))}
      </div>
    </m.section>
  );
}
