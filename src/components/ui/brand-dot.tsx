'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * The full stop of the wordmark. Its colour drifts through the green range on a slow loop and,
 * every few seconds, it takes a random shape (square, circle, diamond, tick). Static under
 * prefers-reduced-motion.
 */

type Shape = 'square' | 'circle' | 'diamond' | 'tick';

const SHAPES: Shape[] = ['square', 'circle', 'diamond', 'tick'];

const SHAPE_CLASS: Record<Shape, string> = {
  square: 'rounded-[1px]',
  circle: 'rounded-full',
  diamond: 'rounded-[1px] rotate-45 scale-90',
  tick: 'rounded-[1px] scale-x-[0.45] scale-y-[1.35]',
};

function pickNext(current: Shape): Shape {
  const others = SHAPES.filter((s) => s !== current);
  return others[Math.floor(Math.random() * others.length)];
}

export function BrandDot({ className }: { className?: string }) {
  const [shape, setShape] = useState<Shape>('square');
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    setAnimated(true);
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(
        () => {
          setShape((s) => pickNext(s));
          schedule();
        },
        3000 + Math.random() * 4000
      );
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  return (
    <span
      aria-hidden
      className={cn(
        'bg-primary ml-[3px] inline-block h-[0.28em] w-[0.28em] origin-center transition-[transform,border-radius] duration-500 ease-out',
        SHAPE_CLASS[shape],
        animated && 'animate-brand-dot motion-reduce:animate-none',
        className
      )}
    />
  );
}
