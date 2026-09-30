import { Suspense } from 'react';
import Link from 'next/link';
import { LogoMark, Wordmark } from '@/components/ui/logo';
import { AuthForm } from '@/components/auth/auth-form';

export default function AuthPage() {
  return (
    <div className="bg-background min-h-screen">
      <main className="flex min-h-screen flex-col items-center justify-center px-6">
        <Link href="/" className="text-foreground mb-10 flex items-center gap-3">
          <LogoMark size={30} />
          <Wordmark className="text-[22px]" />
        </Link>
        <Suspense>
          <AuthForm />
        </Suspense>
      </main>
    </div>
  );
}
