'use client';

import NextLink from 'next/link';
import { motion } from 'motion/react';
import { fadeInUp } from './animations';
import { Button } from '@/components/ui/button';

export default function BottomCTA() {
  return (
    <section className="relative border-t py-24">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[300px] w-[500px] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
        variants={fadeInUp}
        className="relative mx-auto max-w-5xl px-6 text-center"
      >
        <h2 className="text-2xl font-semibold md:text-3xl">
          Free to start. No credit card.
        </h2>
        <p className="mt-3 text-muted-foreground">
          Social alerts, price tracking, and AI analysis. Set up in under a minute.
        </p>
        <div className="mt-8">
          <Button asChild size="lg">
            <NextLink href="/auth?register=true">
              Get started &rarr;
            </NextLink>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
