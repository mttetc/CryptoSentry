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
import { MessageSquare } from 'lucide-react';

const features = [
  {
    id: 'stream',
    label: 'Real-time X monitoring',
    detail:
      'We use the official X filtered stream: your accounts and keywords become server-side rules, and matched posts are pushed to us within seconds. No polling, no scraping, no missed tweets.',
  },
  {
    id: 'ai',
    label: 'AI analysis',
    detail:
      'Each matched tweet gets a bullish / bearish / neutral read and a one-line summary, so you can filter alerts on sentiment and skip the noise.',
  },
  {
    id: 'price',
    label: 'Price alerts',
    detail:
      "Pick a coin, set a target price, pick a direction. Real-time Binance WebSocket feed. When it crosses, you know. Fires once then disarms so you don't get spammed, or set it recurring.",
  },
  {
    id: 'channels',
    label: 'Multi-channel delivery',
    detail:
      'Telegram is the default, and you can also route alerts to email, Discord webhooks, or SMS. Mix and match per alert type. Social to Telegram, price to Discord.',
  },
  {
    id: 'api',
    label: 'REST API',
    detail:
      'Plug CryptoSentry into your own tools. Fetch your alerts and triggers from any script or bot. No UI needed.',
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
                    <MessageSquare className="text-primary h-4 w-4" />
                    <Label className="text-muted-foreground text-xs tracking-wider uppercase">
                      Telegram alert
                    </Label>
                  </div>
                  <Switch checked disabled />
                </div>
              </CardContent>

              {/* Simulated incoming alert */}
              <div className="border-primary/20 bg-primary/5 mx-4 mb-6 rounded-lg border px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/20 flex h-10 w-10 items-center justify-center rounded-full">
                    <MessageSquare className="text-primary h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">CryptoSentry</p>
                    <p className="text-primary text-xs">$SOL mentioned by @CryptoGems</p>
                  </div>
                  <div className="bg-primary h-3 w-3 animate-pulse rounded-full" />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Copy */}
          <motion.div variants={fadeInUp} className="flex-1 text-center lg:text-left">
            <h2 className="text-3xl font-semibold tracking-tight">
              Only the tweets
              <br />
              <span className="text-primary">that matter to you.</span>
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-md text-base leading-relaxed lg:mx-0">
              Pick the accounts, pick the keywords. Matched posts reach your Telegram within seconds
              of being published, with an AI sentiment read attached. Everything else stays out of
              your way.
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
