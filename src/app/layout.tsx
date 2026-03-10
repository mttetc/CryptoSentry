import './globals.css';
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { FEATURES } from '@/lib/config/features';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'CryptoSentry - Crypto Alert App',
  description: 'A powerful alert system for cryptocurrency trading',
  icons: {
    icon: [
      {
        url: '/favicon.svg',
        type: 'image/svg+xml',
      },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} bg-background font-sans antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          {FEATURES.isDevMode && (
            <div className="fixed right-4 bottom-4 z-50 rounded-full bg-yellow-500 px-4 py-2 text-sm font-medium text-white shadow-lg">
              Development Mode
            </div>
          )}
          {children}
        </Providers>
      </body>
    </html>
  );
}
