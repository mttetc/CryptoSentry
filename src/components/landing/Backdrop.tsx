'use client';

import { motion, useReducedMotion } from 'motion/react';

/**
 * Landing background system: a fine grid faded by a radial mask, an accent glow that drifts
 * very slowly, and a faint scanline over the whole page. Pure CSS, no assets.
 */
export function Backdrop() {
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.6, ease: 'easeOut' }}
        className="absolute inset-x-0 top-0 h-[1100px]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(234,240,236,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(234,240,236,0.045) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 60% 20%, #000 20%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 60% 20%, #000 20%, transparent 80%)',
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={
          reduceMotion
            ? { opacity: 1, scale: 1 }
            : { opacity: 1, scale: [1, 1.08, 1], x: [0, 40, 0], y: [0, 24, 0] }
        }
        transition={
          reduceMotion
            ? { duration: 1.2 }
            : { duration: 18, ease: 'easeInOut', repeat: Number.POSITIVE_INFINITY }
        }
        className="absolute -top-[260px] left-1/2 h-[700px] w-[1000px] -translate-x-[10%] rounded-full blur-[40px]"
        style={{
          background: 'radial-gradient(closest-side, rgba(34,197,94,0.22), transparent 72%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(180deg, transparent 0px, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 4px)',
        }}
      />
    </div>
  );
}
