'use client';

import { m, useReducedMotion } from 'motion/react';
import { drawLine, fadeInUp, staggerContainer } from './animations';
import { SectionHeading } from './SectionHeading';

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

// The "signal" run: a green trail draws across the hairline while a dot travels along it and
// Each stop lights up as it passes. One cycle = travel + pause; every keyframe below shares it.
const TRAVEL_S = 4.2;
const FADE_S = 0.8;
const PAUSE_S = 1.6;
const CYCLE_S = TRAVEL_S + FADE_S + PAUSE_S;
const LAST = steps.length - 1;
const GREEN = '#22C55E';
const IDLE = '#3B4A43';

export default function HowItWorks() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="how" className="scroll-mt-20 py-24">
      <m.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="mx-auto flex max-w-6xl flex-col gap-14 px-6 lg:px-10"
      >
        <SectionHeading
          eyebrow="How it works"
          title={
            <>
              One pipeline. Four stops.
              <br />
              You only see the last one.
            </>
          }
          lede="Your alerts become server-side rules on the X filtered stream. X pushes only what matches. We check, analyse and forward."
        />

        {/* Timeline: one hairline that draws itself, then a signal runs through it on a loop */}
        <div className="relative">
          <m.div
            variants={drawLine}
            className="absolute inset-x-0 top-0 hidden h-px origin-left bg-white/[0.1] lg:block"
          />
          {!reduceMotion && (
            <>
              <m.div
                aria-hidden
                className="from-primary/0 via-primary/70 to-primary absolute inset-x-0 top-0 hidden h-px origin-left bg-gradient-to-r lg:block"
                initial={{ scaleX: 0, opacity: 1 }}
                animate={{ scaleX: [0, 1, 1], opacity: [1, 1, 0] }}
                transition={{
                  duration: TRAVEL_S + FADE_S,
                  times: [0, TRAVEL_S / (TRAVEL_S + FADE_S), 1],
                  ease: 'linear',
                  repeat: Number.POSITIVE_INFINITY,
                  repeatDelay: PAUSE_S,
                }}
              />
              <m.div
                aria-hidden
                className="bg-primary absolute -top-[5px] hidden h-[9px] w-[9px] -translate-x-1/2 rounded-full shadow-[0_0_12px_2px_rgba(34,197,94,0.55)] lg:block"
                initial={{ left: '0%', opacity: 0 }}
                animate={{ left: ['0%', '100%', '100%'], opacity: [1, 1, 0] }}
                transition={{
                  duration: TRAVEL_S + FADE_S,
                  times: [0, TRAVEL_S / (TRAVEL_S + FADE_S), 1],
                  ease: 'linear',
                  repeat: Number.POSITIVE_INFINITY,
                  repeatDelay: PAUSE_S,
                }}
              />
            </>
          )}
          <div className="grid gap-y-10 lg:grid-cols-4 lg:gap-x-10 lg:gap-y-12">
            {steps.map((step, i) => {
              const litAt = (TRAVEL_S * i) / LAST;
              return (
                <m.div
                  key={step.title}
                  variants={fadeInUp}
                  className="group relative flex flex-col gap-4 border-l border-white/[0.1] pl-6 lg:border-l-0 lg:pt-8 lg:pl-0"
                >
                  {step.accent ? (
                    <m.span
                      aria-hidden
                      className="bg-primary absolute top-1 -left-[5px] h-[9px] w-[9px] rounded-full shadow-[0_0_0_4px_rgba(34,197,94,0.18)] lg:-top-[5px] lg:left-0"
                      animate={
                        reduceMotion
                          ? undefined
                          : {
                              scale: [1, 1.6, 1],
                              boxShadow: [
                                '0 0 0 4px rgba(34,197,94,0.18)',
                                '0 0 0 10px rgba(34,197,94,0)',
                                '0 0 0 4px rgba(34,197,94,0.18)',
                              ],
                            }
                      }
                      transition={{
                        duration: 0.9,
                        delay: litAt,
                        repeat: Number.POSITIVE_INFINITY,
                        repeatDelay: CYCLE_S - 0.9,
                        ease: 'easeOut',
                      }}
                    />
                  ) : (
                    <m.span
                      aria-hidden
                      className="absolute top-1 -left-[5px] h-[9px] w-[9px] rounded-full lg:-top-[5px] lg:left-0"
                      style={{ backgroundColor: IDLE }}
                      animate={
                        reduceMotion
                          ? undefined
                          : { backgroundColor: [IDLE, GREEN, GREEN, IDLE], scale: [1, 1.5, 1.2, 1] }
                      }
                      transition={{
                        duration: 1.2,
                        delay: litAt,
                        repeat: Number.POSITIVE_INFINITY,
                        repeatDelay: CYCLE_S - 1.2,
                        ease: 'easeOut',
                      }}
                    />
                  )}
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
              );
            })}
          </div>
        </div>
      </m.div>
    </section>
  );
}
