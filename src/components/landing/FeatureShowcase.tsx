'use client';

import { motion } from 'motion/react';
import { fadeInUp, staggerContainer } from './animations';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Phone } from 'lucide-react';

export default function FeatureShowcase() {
  return (
    <section className="border-t py-24">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        className="mx-auto flex max-w-5xl flex-col items-center gap-16 px-6 lg:flex-row"
      >
        {/* Mockup card */}
        <motion.div variants={fadeInUp} className="relative w-full max-w-sm">
          <div className="absolute -inset-4 rounded-2xl bg-primary/5 blur-2xl" />
          <Card className="relative">
            <CardContent className="space-y-5 pt-6">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Account</Label>
                <div className="mt-1 font-mono text-sm">@CryptoGems</div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Keywords</Label>
                <div className="mt-1 flex gap-2">
                  <Badge variant="default" className="font-mono">$PEPE</Badge>
                  <Badge variant="default" className="font-mono">$SOL</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Telegram Call</Label>
                </div>
                <Switch checked disabled />
              </div>
            </CardContent>

            {/* Simulated incoming call overlay */}
            <div className="mx-6 mb-6 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">CryptoSentry</p>
                  <p className="text-xs text-primary">Incoming call...</p>
                </div>
                <div className="h-3 w-3 animate-pulse rounded-full bg-primary" />
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
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground lg:mx-0">
            Notifications get buried or muted. A Telegram voice call rings through Do Not Disturb, plays on your headphones or car speakers, and takes under 30 seconds from tweet to ring.
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
