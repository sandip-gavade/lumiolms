'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/button';
import { FieldError, Input, Label } from '@/components/input';
import * as authApi from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth-store';

const schema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const result = await authApi.login(values);
      setSession(result);
      router.push('/dashboard');
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  }

  return (
    <AuthShell
      side={
        <>
          <div className="inline-flex items-center gap-2 bg-white/[0.14] border border-white/20 rounded-full px-3.5 py-1.5 text-[13px] font-semibold mb-6">
            ★ Rated 4.8 by 40,000+ learners
          </div>
          <h2 className="font-display font-extrabold text-[clamp(28px,3.4vw,40px)] leading-[1.1] tracking-tight mb-4">
            Learn by building real projects.
          </h2>
          <p className="text-base leading-relaxed text-white/85 mb-8">
            Hands-on courses in code, design, data, and film — taught by people who actually ship.
          </p>
          <div className="bg-white/10 border border-white/[0.18] rounded-2xl p-5 backdrop-blur-sm">
            <p className="text-[15px] leading-relaxed mb-3.5 font-medium">
              &ldquo;I went from copy-pasting tutorials to shipping my own apps in three months. The
              project-based path just clicks.&rdquo;
            </p>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center font-bold text-sm">
                PR
              </div>
              <div>
                <div className="font-bold text-sm">Priya R.</div>
                <div className="text-xs text-white/70">Frontend Developer</div>
              </div>
            </div>
          </div>
        </>
      }
    >
      <h1 className="font-display font-extrabold text-[30px] tracking-tight mb-2">Welcome back</h1>
      <p className="text-ink-500 text-[15px] mb-7">Pick up right where you left off.</p>

      {serverError && (
        <div className="bg-danger-light text-danger-dark text-sm rounded-xl px-3.5 py-3 mb-4">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Label>Email</Label>
        <Input type="email" placeholder="you@example.com" {...register('email')} className="mb-1" />
        <div className="mb-4">
          <FieldError>{errors.email?.message}</FieldError>
        </div>

        <div className="flex justify-between items-center mb-1.5">
          <Label>Password</Label>
          <Link href="/forgot-password" className="text-[13px] text-brand-600 font-semibold">
            Forgot password?
          </Link>
        </div>
        <Input type="password" placeholder="••••••••" {...register('password')} className="mb-1" />
        <div className="mb-5">
          <FieldError>{errors.password?.message}</FieldError>
        </div>

        <Button type="submit" loading={isSubmitting} className="w-full">
          Log in
        </Button>
      </form>
      <p className="text-center text-ink-500 text-sm mt-6">
        New to lumio?{' '}
        <Link href="/signup" className="text-brand-600 font-bold">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
