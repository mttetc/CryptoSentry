'use client';

import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export function AuthForm() {
  const searchParams = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get('register') === 'true');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(isSignUp ? signUpSchema : signInSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(data: z.infer<typeof signUpSchema>) {
    setLoading(true);

    if (isSignUp) {
      const { error } = await authClient.signUp.email({
        name: data.email.split('@')[0],
        email: data.email,
        password: data.password,
      });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      toast.success('Account created');
    } else {
      const { error } = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      toast.success('Signed in');
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
      <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="mb-6">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 12L6 8L10 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back
      </Button>

      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold">
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {isSignUp ? 'Start monitoring in under a minute' : 'Sign in to your account'}
        </p>
      </div>

      <div className="space-y-4">
        <Button variant="outline" onClick={handleGoogleSignIn} className="w-full">
          <GoogleIcon />
          Continue with Google
        </Button>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-muted-foreground text-xs">or</span>
          <Separator className="flex-1" />
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="email"
                  placeholder="you@example.com"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="password"
                  placeholder={isSignUp ? '8 characters minimum' : 'Your password'}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Button type="submit" disabled={loading} className="w-full">
            {buttonLabel}
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-sm">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary cursor-pointer hover:underline"
          >
            {isSignUp ? 'Sign in' : 'Create one'}
          </button>
        </p>
      </div>
    </div>
  );
}
