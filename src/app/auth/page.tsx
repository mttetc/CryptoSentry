import { Suspense } from 'react';
import Link from 'next/link';
import { LogoMark } from '@/components/ui/logo';
import { AuthForm } from '@/components/auth/auth-form';

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-neutral-950">
      <main className="flex min-h-screen flex-col items-center justify-center px-6">
        <Link href="/" className="mb-10 flex items-center gap-2">
          <LogoMark size={32} />
          <span className="text-xl font-semibold tracking-tight text-white">CryptoSentry</span>
        </Link>
        <Suspense>
          <AuthForm />
        </Suspense>
      </main>
    </div>
  );
}
