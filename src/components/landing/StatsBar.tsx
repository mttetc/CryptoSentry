'use client';

import { motion } from 'motion/react';
import { fadeInUp } from './animations';
import { Separator } from '@/components/ui/separator';

const stats = [
  { label: 'to start', value: 'Free' },
  { label: 'alert to call', value: '<30s' },
  { label: 'to set up', value: '1 min' },
];

export default function StatsBar() {
  return (
    <div>
      <Separator />
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
        variants={fadeInUp}
        className="py-8"
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-8 px-6 text-center md:gap-16">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <span className="font-mono text-lg font-semibold">{stat.value}</span>
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      </motion.section>
      <Separator />
    </div>
  );
}
