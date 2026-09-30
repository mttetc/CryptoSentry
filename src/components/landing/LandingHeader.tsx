'use client';

import { useState } from 'react';
import NextLink from 'next/link';
import { motion, useMotionValueEvent, useScroll } from 'motion/react';
import { Logo } from '@/components/ui/logo';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';

const NAV = [
  { href: '#how', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
];

export default function LandingHeader() {
  const { user } = useUser();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, 'change', (y) => {
    setScrolled(y > 24);
  });

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={
        scrolled
          ? 'bg-background/85 fixed top-0 z-50 w-full border-b border-white/[0.1] backdrop-blur-md transition-colors duration-300'
          : 'fixed top-0 z-50 w-full border-b border-transparent bg-transparent transition-colors duration-300'
      }
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 lg:px-10">
        <Logo href="/" />

        <nav className="text-ink-muted hidden items-center gap-8 text-sm md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="hover:text-foreground relative transition-colors after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-current after:transition-all after:duration-300 hover:after:w-full"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Button asChild size="sm">
              <NextLink href="/dashboard">Go to dashboard</NextLink>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <NextLink href="/auth">Sign in</NextLink>
              </Button>
              <Button asChild size="sm" className="text-[#06110A]">
                <NextLink href="/auth?register=true">Start free</NextLink>
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}
