'use client';

import type { ReactNode } from 'react';
import { m } from 'motion/react';
import { fadeInUp } from './animations';
import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  /** `split` puts the lede on the right (desktop); `stack` keeps everything in one column. */
  layout?: 'split' | 'stack';
  /** Animate on its own when not inside a staggered parent. */
  standalone?: boolean;
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  layout = 'split',
  standalone = false,
  className,
}: SectionHeadingProps) {
  const motionProps = standalone
    ? { initial: 'hidden', whileInView: 'visible', viewport: { once: true, amount: 0.3 } }
    : {};

  return (
    <m.div
      variants={fadeInUp}
      {...motionProps}
      className={cn(
        'flex flex-col gap-6',
        layout === 'split' && 'lg:flex-row lg:items-end lg:justify-between',
        className
      )}
    >
      <div className="flex flex-col gap-3.5">
        <span className="text-primary font-mono text-xs tracking-[0.12em] uppercase">
          {eyebrow}
        </span>
        <h2
          className={cn(
            'font-display leading-[1.05] font-semibold tracking-[-0.03em]',
            layout === 'split' ? 'text-3xl md:text-[44px]' : 'text-3xl md:text-[40px]'
          )}
        >
          {title}
        </h2>
      </div>
      {lede && (
        <p
          className={cn(
            'text-ink-muted text-[15px] leading-relaxed',
            layout === 'split' ? 'max-w-md' : 'max-w-xl'
          )}
        >
          {lede}
        </p>
      )}
    </m.div>
  );
}
