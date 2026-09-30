'use client';

import { m } from 'motion/react';
import { drawLine, fadeInUp, popDot, staggerContainer } from './animations';

const steps = [
  {
    title: 'You pick accounts and keywords',
    desc: 'Any public X handle. Tokens, phrases, cashtags. Replies and quotes stay out unless you want them.',
    output: '@cryptogems · $sol, $pepe',
  },
  {
    title: 'We compile them into X rules',
    desc: 'One rule per account on the official filtered stream. X does the matching at the source.',
    output: 'from:cryptogems ($sol OR $pepe)',
  },
  {
    title: 'Matches are pushed and analysed',
    desc: 'Each post arrives once, gets a bullish, bearish or neutral read and a one-line summary.',
    output: 'bullish · "rotation into SOL"',
  },
  {
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
        className="mx-auto flex max-w-6xl flex-col gap-14 px-6 lg:px-10"
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

        {/* Timeline: one hairline that draws itself, four columns, no boxes */}
        <div className="relative">
          <m.div
            variants={drawLine}
            className="absolute inset-x-0 top-0 h-px origin-left bg-white/[0.1]"
          />
          <div className="grid gap-x-10 gap-y-12 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <m.div
                key={step.title}
                variants={fadeInUp}
                className="group relative flex flex-col gap-4 pt-8"
              >
                <m.span
                  variants={popDot}
                  className={
                    step.accent
                      ? 'bg-primary absolute -top-[5px] left-0 h-[9px] w-[9px] rounded-full shadow-[0_0_0_4px_rgba(34,197,94,0.18)]'
                      : 'group-hover:bg-primary absolute -top-[5px] left-0 h-[9px] w-[9px] rounded-full bg-[#3B4A43] transition-colors duration-300'
                  }
                />
                <span
                  className={
                    step.accent
                      ? 'text-primary font-mono text-xs'
                      : 'text-ink-muted group-hover:text-primary font-mono text-xs transition-colors duration-300'
                  }
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="font-display text-[22px] leading-tight font-semibold tracking-[-0.02em]">
                  {step.title}
                </h3>
                <p className="text-ink-muted text-sm leading-relaxed">{step.desc}</p>
                <code
                  className={
                    step.accent
                      ? 'text-primary mt-auto font-mono text-xs'
                      : 'text-ink-soft mt-auto font-mono text-xs'
                  }
                >
                  {step.output}
                </code>
              </m.div>
            ))}
          </div>
        </div>
      </m.div>
    </section>
  );
}
