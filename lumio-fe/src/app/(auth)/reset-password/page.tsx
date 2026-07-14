'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/button';
import { FieldError, Input, Label } from '@/components/input';
import * as authApi from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';

const schema = z
  .object({
    newPassword: z.string().min(10, 'Password must be at least 10 characters.').max(72),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });
type FormValues = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await authApi.resetPassword({ token, newPassword: values.newPassword });
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      setServerError(
        err instanceof ApiError ? err.message : 'This reset link is invalid or has expired.',
      );
    }
  }

  return (
    <AuthShell
      side={
        <h2 className="font-display font-extrabold text-[clamp(28px,3.4vw,40px)] leading-[1.1] tracking-tight">
          Choose a new password.
        </h2>
      }
    >
      <h1 className="font-display font-extrabold text-[30px] tracking-tight mb-2">Set new password</h1>
      <p className="text-ink-500 text-[15px] mb-7">Choose a strong password you haven&apos;t used before.</p>

      {!token && (
        <div className="bg-danger-light text-danger-dark text-sm rounded-xl px-3.5 py-3 mb-4">
          This link is missing a reset token. Request a new one from the forgot password page.
        </div>
      )}
      {serverError && (
        <div className="bg-danger-light text-danger-dark text-sm rounded-xl px-3.5 py-3 mb-4">
          {serverError}
        </div>
      )}
      {done ? (
        <div className="bg-success-light text-success-dark text-sm rounded-xl px-3.5 py-3.5">
          Password updated. Redirecting you to log in…
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Label>New password</Label>
          <Input type="password" placeholder="••••••••" {...register('newPassword')} className="mb-1" />
          <div className="mb-3">
            <FieldError>{errors.newPassword?.message}</FieldError>
          </div>
          <Label>Confirm new password</Label>
          <Input type="password" placeholder="••••••••" {...register('confirmPassword')} className="mb-1" />
          <div className="mb-5">
            <FieldError>{errors.confirmPassword?.message}</FieldError>
          </div>
          <Button type="submit" loading={isSubmitting} disabled={!token} className="w-full">
            Update password
          </Button>
        </form>
      )}
      <p className="text-center text-ink-500 text-sm mt-6">
        <Link href="/login" className="text-brand-600 font-bold">
          Back to log in
        </Link>
      </p>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
