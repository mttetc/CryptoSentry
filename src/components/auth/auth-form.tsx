'use client';

import { authClient } from '@/lib/auth-client';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  );
}

export function AuthForm() {
  const searchParams = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get('register') === 'true');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get('email'));
    const password = String(formData.get('password'));

    if (isSignUp) {
      const { error } = await authClient.signUp.email({
        name: email.split('@')[0],
        email,
        password,
      });
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
        setLoading(false);
        return;
      }
      toast({ title: 'Account created' });
    } else {
      const { error } = await authClient.signIn.email({
        email,
        password,
      });
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
        setLoading(false);
        return;
      }
      toast({ title: 'Signed in' });
    }

    setLoading(false);
    router.push('/dashboard');
  }

  async function handleGoogleSignIn() {
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/dashboard',
    });
  }

  let buttonLabel = 'Sign in';
  if (loading) {
    buttonLabel = 'Loading...';
  } else if (isSignUp) {
    buttonLabel = 'Create account';
  }

  return (
    <div className="w-full max-w-sm">
      <button
        type="button"
        onClick={() => router.push('/')}
        className="mb-6 flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-white"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-white">
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          {isSignUp ? 'Start monitoring in under a minute' : 'Sign in to your account'}
        </p>
      </div>

      <div className="space-y-4">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-neutral-500">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm text-neutral-400">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-neutral-600 focus:border-sentry-green/50 focus:outline-none focus:ring-1 focus:ring-sentry-green/50"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm text-neutral-400">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              placeholder={isSignUp ? '8 characters minimum' : 'Your password'}
              className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-neutral-600 focus:border-sentry-green/50 focus:outline-none focus:ring-1 focus:ring-sentry-green/50"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="h-10 w-full rounded-lg bg-sentry-green text-sm font-medium text-white transition-colors hover:bg-sentry-green/90 disabled:opacity-50"
          >
            {buttonLabel}
          </button>
        </form>

        <p className="text-center text-sm text-neutral-500">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sentry-green hover:underline"
          >
            {isSignUp ? 'Sign in' : 'Create one'}
          </button>
        </p>
      </div>
    </div>
  );
}
