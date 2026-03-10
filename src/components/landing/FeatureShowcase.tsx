'use client';

import { motion } from 'motion/react';
import { fadeInUp, staggerContainer } from './animations';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Phone,
  Brain,
  TrendingUp,
  Wallet,
  Bell,
  Shield,
  Layers,
  Code,
} from 'lucide-react';

const features = [
  {
    icon: Phone,
    title: 'Telegram Voice Calls',
    description:
      'Your phone actually rings. Cuts through Do Not Disturb, plays on headphones or car speakers. Under 30 seconds from tweet to call.',
  },
  {
    icon: Brain,
    title: 'AI Sentiment Analysis',
    description:
      'Every matched tweet is analyzed for sentiment and urgency. Know if a mention is bullish, bearish, or noise before you act.',
  },
  {
    icon: TrendingUp,
    title: 'Price Alerts',
    description:
      'Set price targets via CoinGecko data. Get notified when a coin crosses your threshold, above or below.',
  },
  {
    icon: Wallet,
    title: 'Whale Wallet Tracking',
    description:
      'Monitor on-chain movements of known whale wallets. Get alerted on large transfers and accumulation patterns.',
  },
  {
    icon: Bell,
    title: 'Multi-Channel Notifications',
    description:
      'Beyond Telegram calls: receive alerts via email, Discord webhooks, or SMS. Route different alert types to different channels.',
  },
  {
    icon: Shield,
    title: 'Influencer Reliability Scores',
    description:
      'Not all calls are equal. We track historical accuracy of influencers so you can weigh alerts accordingly.',
  },
  {
    icon: Layers,
    title: 'Combined Smart Alerts',
    description:
      'Create composite alerts that combine social + price + whale signals. Trigger only when multiple conditions align.',
  },
  {
    icon: Code,
    title: 'REST API Access',
    description:
      'Build your own integrations. Programmatic access to alerts, portfolio data, and notification management.',
  },
];

export default function FeatureShowcase() {
  return (
    <section className="border-t py-24">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="mx-auto max-w-5xl px-6"
      >
        {/* Hero mockup row */}
        <div className="flex flex-col items-center gap-16 lg:flex-row">
          <motion.div variants={fadeInUp} className="relative w-full max-w-sm">
            <div className="bg-primary/5 absolute -inset-4 rounded-2xl blur-2xl" />
            <Card className="relative">
              <CardContent className="space-y-5 pt-6">
                <div>
                  <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                    Account
                  </Label>
                  <div className="mt-1 font-mono text-sm">@CryptoGems</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                    Keywords
                  </Label>
                  <div className="mt-1 flex gap-2">
                    <Badge variant="default" className="font-mono">
                      $PEPE
                    </Badge>
                    <Badge variant="default" className="font-mono">
                      $SOL
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="text-primary h-4 w-4" />
                    <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                      Telegram Call
                    </Label>
                  </div>
                  <Switch checked disabled />
                </div>
              </CardContent>

              {/* Simulated incoming call overlay */}
              <div className="border-primary/20 bg-primary/5 mx-4 mb-6 rounded-lg border px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/20 flex h-10 w-10 items-center justify-center rounded-full">
                    <Phone className="text-primary h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">CryptoSentry</p>
                    <p className="text-primary text-xs">Incoming call...</p>
                  </div>
                  <div className="bg-primary h-3 w-3 animate-pulse rounded-full" />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Copy */}
          <motion.div variants={fadeInUp} className="flex-1 text-center lg:text-left">
            <h2 className="text-3xl font-semibold tracking-tight">
              Why a call,
              <br />
              <span className="text-primary">not a notification?</span>
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-md text-base leading-relaxed lg:mx-0">
              Notifications get buried or muted. A Telegram voice call rings through Do Not Disturb,
              plays on your headphones or car speakers, and takes under 30 seconds from tweet to ring.
            </p>
          </motion.div>
        </div>

        {/* Feature grid */}
        <motion.div variants={fadeInUp} className="mt-24">
          <h3 className="mb-10 text-center text-2xl font-semibold tracking-tight">
            Everything you need for crypto intelligence
          </h3>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-border/50">
                  <CardContent className="space-y-2 pt-6">
                    <Icon className="h-6 w-6 text-primary" />
                    <h4 className="font-semibold">{feature.title}</h4>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
