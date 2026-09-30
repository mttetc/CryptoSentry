'use client';

import { m } from 'motion/react';
import { Radio, Filter, Crosshair, Send } from 'lucide-react';
import { fadeInUp, staggerContainer } from './animations';

const steps = [
  {
    icon: Radio,
    title: 'You pick accounts and keywords',
    desc: 'Any public X handle. Tokens, phrases, cashtags. Replies and quotes stay out unless you want them.',
    output: '@cryptogems · $sol, $pepe',
  },
  {
    icon: Filter,
    title: 'We compile them into X rules',
    desc: 'One rule per account on the official filtered stream. X does the matching at the source.',
    output: 'from:cryptogems ($sol OR $pepe)',
  },
  {
    icon: Crosshair,
    title: 'Matches are pushed and analysed',
    desc: 'Each post arrives once, gets a bullish, bearish or neutral read and a one-line summary.',
    output: '● bullish · "rotation into SOL"',
  },
  {
    icon: Send,
    title: 'You get the alert. Seconds later.',
    desc: 'Telegram by default. Discord, email and SMS on paid plans. Tweet text, type, keywords, sentiment, link.',
    output: 'delivered · 1.4 s after the post',
    accent: true,
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 py-24">
      <m.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="mx-auto flex max-w-6xl flex-col gap-12 px-6 lg:px-10"
      >
        <m.div
          variants={fadeInUp}
          className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="flex flex-col gap-3.5">
            <span className="text-primary font-mono text-xs tracking-[0.12em] uppercase">
              How it works
            </span>
            <h2 className="font-display text-3xl leading-[1.05] font-semibold tracking-[-0.03em] md:text-[44px]">
              One pipeline. Four stops.
              <br />
              You only see the last one.
            </h2>
          </div>
          <p className="text-ink-muted max-w-sm text-[15px] leading-relaxed">
            Your alerts become server-side rules on the X filtered stream. X pushes only what
            matches. We check, analyse and forward.
          </p>
        </m.div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <m.div
                key={step.title}
                variants={fadeInUp}
                className={
                  step.accent
                    ? 'flex min-h-[260px] flex-col gap-4 rounded-2xl border border-[rgba(34,197,94,0.35)] bg-[linear-gradient(180deg,rgba(34,197,94,0.1),rgba(34,197,94,0.02))] p-6'
                    : 'bg-surface flex min-h-[260px] flex-col gap-4 rounded-2xl border border-white/[0.1] p-6'
                }
              >
                <div className="flex items-center justify-between">
                  <div
                    className={
                      step.accent
                        ? 'bg-primary flex h-10 w-10 items-center justify-center rounded-[10px] text-[#06110A]'
                        : 'text-primary flex h-10 w-10 items-center justify-center rounded-[10px] bg-[rgba(34,197,94,0.12)]'
                    }
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className={
                      step.accent
                        ? 'text-primary font-mono text-xs'
                        : 'text-ink-muted font-mono text-xs'
                    }
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p
                  className={
                    step.accent
                      ? 'text-ink-soft text-sm leading-relaxed'
                      : 'text-ink-muted text-sm leading-relaxed'
                  }
                >
                  {step.desc}
                </p>
                <div
                  className={
                    step.accent
                      ? 'text-primary mt-auto rounded-md bg-[rgba(6,17,10,0.5)] px-2.5 py-2 font-mono text-xs'
                      : 'text-ink-soft mt-auto rounded-md bg-white/[0.05] px-2.5 py-2 font-mono text-xs'
                  }
                >
                  {step.output}
                </div>
              </m.div>
            );
          })}
        </div>
      </m.div>
    </section>
  );
}
