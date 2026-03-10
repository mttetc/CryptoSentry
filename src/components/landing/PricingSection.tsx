'use client';

import NextLink from 'next/link';
import { motion } from 'motion/react';
import { fadeInUp, staggerContainer } from './animations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '0',
    description: 'Get started with basic monitoring',
    features: ['2 alerts', 'Unlimited keywords', 'Telegram voice calls', '<30s tweet-to-call'],
    cta: 'Get started',
    href: '/auth?register=true',
  },
  {
    name: 'Pro',
    price: '9',
    description: 'For serious traders who need more coverage',
    features: [
      '10 alerts',
      'Unlimited keywords',
      'Telegram voice calls',
      '<30s tweet-to-call',
      'Priority polling',
    ],
    cta: 'Coming soon',
    href: '/auth?register=true',
  },
];

export default function PricingSection() {
  return (
    <section className="border-t py-24">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        className="mx-auto max-w-5xl px-6"
      >
        <motion.div variants={fadeInUp} className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Simple pricing</h2>
          <p className="text-muted-foreground mt-3">
            Start free. Upgrade when you need more alerts.
          </p>
        </motion.div>

        <div className="mx-auto mt-12 grid max-w-2xl items-stretch gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <motion.div key={plan.name} variants={fadeInUp}>
              <Card className="flex h-full flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-semibold">{plan.price}&#8364;</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-muted-foreground mt-2 text-sm">{plan.description}</p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="text-primary h-4 w-4 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant="outline" className="w-full">
                    <NextLink href={plan.href}>{plan.cta}</NextLink>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.p
          variants={fadeInUp}
          className="text-muted-foreground mx-auto mt-8 max-w-lg text-center text-xs"
        >
          CryptoSentry is in early access. We rely on public data sources that may occasionally
          experience disruptions. As adoption grows, we invest in more reliable infrastructure.
        </motion.p>
      </motion.div>
    </section>
  );
}
