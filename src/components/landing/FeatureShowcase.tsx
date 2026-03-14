'use client';

import { motion } from 'motion/react';
import { fadeInUp, staggerContainer } from './animations';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Phone } from 'lucide-react';

const features = [
  {
    id: 'ai',
    label: 'AI analysis',
    detail:
      'Each matched tweet gets a bullish / bearish / neutral read and a one-line summary. Powered by GPT-4o-mini, fast enough to not slow down alerts, smart enough to filter the noise.',
  },
  {
    id: 'price',
    label: 'Price alerts',
    detail:
      "Pick a coin, set a target price, pick a direction. Real-time Binance WebSocket feed. When it crosses, you know. Fires once then disarms so you don't get spammed.",
  },
  {
    id: 'whale',
    label: 'Whale wallet tracking',
    detail:
      'Add an ETH or SOL address. Set a minimum USD threshold. When a transfer above that amount hits, you get the tx hash, the amount, and the token. Know when smart money moves before CT does.',
  },
  {
    id: 'channels',
    label: 'Multi-channel delivery',
    detail:
      'Telegram calls are the default, but you can also route alerts to email, Discord webhooks, or SMS. Mix and match per alert type. Social to Telegram, price to Discord, whale to SMS.',
  },
  {
    id: 'scores',
    label: 'Influencer reliability scores',
    detail:
      "We snapshot the price when an influencer mentions a token, then check again at 1h and 24h. Over time, each influencer builds a track record per token. You see who actually calls winners vs. who's just loud.",
  },
  {
    id: 'composite',
    label: 'Composite alerts',
    detail:
      'Define multiple conditions ("influencer tweets about SOL" + "SOL price jumps 5%") and set a time window. The alert only fires when all conditions are met. Less noise, more signal.',
  },
  {
    id: 'portfolio',
    label: 'Portfolio impact',
    detail:
      'Add your positions (token, amount, avg buy price). When an alert fires for a token you hold, the notification includes the dollar impact. Not just "SOL is up" but "your 50 SOL gained $320".',
  },
  {
    id: 'api',
    label: 'REST API',
    detail:
      'Plug CryptoSentry into your own tools. Fetch your alerts, triggers, and scores from any script or bot. No UI needed.',
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
              plays on your headphones or car speakers, and takes under 30 seconds from tweet to
              ring.
            </p>
          </motion.div>
        </div>

        {/* Feature accordion */}
        <motion.div variants={fadeInUp} className="mt-24">
          <h3 className="mb-8 text-center text-2xl font-semibold tracking-tight">
            What else is in the box
          </h3>
          <Accordion type="single" collapsible className="mx-auto max-w-2xl">
            {features.map((f) => (
              <AccordionItem key={f.id} value={f.id}>
                <AccordionTrigger className="text-sm hover:no-underline">
                  {f.label}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground leading-relaxed">{f.detail}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </motion.div>
    </section>
  );
}
