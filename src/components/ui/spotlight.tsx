'use client';

import type { MouseEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
}

function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
}

export function SpotlightCard({ children, className }: SpotlightCardProps) {
  return (
    <div
      onMouseMove={handleMouseMove}
      className={cn('group/spotlight relative overflow-hidden rounded-xl', className)}
    >
      {/* Spotlight gradient that follows the mouse */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover/spotlight:opacity-100"
        style={{
          background:
            'radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(34,197,94,0.06), transparent 40%)',
        }}
      />
      {children}
    </div>
  );
}
