'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/settings', label: 'General' },
  { href: '/settings/portfolio', label: 'Portfolio' },
  { href: '/settings/api', label: 'API Keys' },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 rounded-lg border border-border/50 bg-muted/30 p-1">
      {navItems.map((item) => {
        const isActive =
          item.href === '/settings'
            ? pathname === '/settings'
            : pathname.startsWith(item.href);

        return (
          <NextLink
            key={item.href}
            href={item.href}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {item.label}
          </NextLink>
        );
      })}
    </nav>
  );
}
