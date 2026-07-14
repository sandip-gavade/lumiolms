'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/button';
import { FieldError, Input, Label } from '@/components/input';
import * as authApi from '@/lib/api/auth';

const schema = z.object({ email: z.string().email('Enter a valid email address.') });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    await authApi.forgotPassword(values.email).catch(() => {});
    setSent(true);
  }

  return (
    <AuthShell
      side={
        <>
          <h2 className="font-display font-extrabold text-[clamp(28px,3.4vw,40px)] leading-[1.1] tracking-tight mb-4">
            Forgot your password?
          </h2>
          <p className="text-base leading-relaxed text-white/85">
            No problem — we&apos;ll send you a link to get back into your account in no time.
          </p>
        </>
      }
    >
      <h1 className="font-display font-extrabold text-[30px] tracking-tight mb-2">Reset your password</h1>
      <p className="text-ink-500 text-[15px] mb-7">
        Enter the email associated with your account and we&apos;ll send a reset link.
      </p>

      {sent ? (
        <div className="bg-success-light text-success-dark text-sm rounded-xl px-3.5 py-3.5 leading-relaxed">
          If an account exists for that email, a password reset link is on its way. Check your
          inbox.
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Label>Email</Label>
          <Input type="email" placeholder="you@example.com" {...register('email')} className="mb-1" />
          <div className="mb-5">
            <FieldError>{errors.email?.message}</FieldError>
          </div>
          <Button type="submit" loading={isSubmitting} className="w-full">
            Send reset link
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
