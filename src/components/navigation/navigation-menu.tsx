'use client';

import Link from 'next/link';

export function NavigationMenu() {
  return (
    <nav className="flex items-center space-x-6">
      <Link href="/dashboard" className="text-sm font-medium hover:text-primary">
        Dashboard
      </Link>
      <Link href="/settings" className="text-sm font-medium hover:text-primary">
        Settings
      </Link>
    </nav>
  );
}
