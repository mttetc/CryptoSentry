import { Suspense } from 'react';
import Link from 'next/link';
import { Wordmark } from '@/components/ui/logo';
import { AuthForm } from '@/components/auth/auth-form';

export default function AuthPage() {
  return (
    <div className="bg-background min-h-screen">
      <main className="flex min-h-screen flex-col items-center justify-center px-6">
        <Link href="/" className="text-foreground mb-10 flex items-center">
          <Wordmark className="text-[24px]" />
        </Link>
        <Suspense>
          <AuthForm />
        </Suspense>
      </main>
    </div>
  );
}
