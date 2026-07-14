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
  name: z.string().min(1, 'Enter your name.').max(200),
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(10, 'Password must be at least 10 characters.').max(72),
});
type FormValues = z.infer<typeof schema>;

const PERKS = [
  { icon: '🎬', title: 'Learn by building', desc: 'Every course centers on real, finished projects you can show off.' },
  { icon: '∞', title: 'Lifetime access', desc: 'Buy once, revisit anytime — across web and mobile.' },
  { icon: '🏆', title: 'Earn certificates', desc: 'Shareable certificates to add to your profile and résumé.' },
  { icon: '💬', title: 'Real instructor support', desc: 'Ask questions and get answers in active course Q&A.' },
];

export default function SignupPage() {
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
      const result = await authApi.signup(values);
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
          <h2 className="font-display font-extrabold text-[clamp(28px,3.4vw,40px)] leading-[1.1] tracking-tight mb-7">
            Everything you need to level up.
          </h2>
          <div className="flex flex-col gap-4.5 gap-y-[18px]">
            {PERKS.map((p) => (
              <div key={p.title} className="flex gap-3.5 items-start">
                <div className="w-[34px] h-[34px] rounded-[10px] bg-white/[0.16] flex items-center justify-center shrink-0 text-base">
                  {p.icon}
                </div>
                <div>
                  <div className="font-bold text-[15px] mb-0.5">{p.title}</div>
                  <div className="text-[13.5px] text-white/[0.82] leading-relaxed">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-7 mt-8 pt-7 border-t border-white/[0.18]">
            <div>
              <div className="font-display font-extrabold text-2xl">1,200+</div>
              <div className="text-xs text-white/75">Courses</div>
            </div>
            <div>
              <div className="font-display font-extrabold text-2xl">40k+</div>
              <div className="text-xs text-white/75">Learners</div>
            </div>
            <div>
              <div className="font-display font-extrabold text-2xl">4.8★</div>
              <div className="text-xs text-white/75">Avg rating</div>
            </div>
          </div>
        </>
      }
    >
      <h1 className="font-display font-extrabold text-[30px] tracking-tight mb-2">Create your account</h1>
      <p className="text-ink-500 text-[15px] mb-6">Start learning today — it&apos;s free to join.</p>

      {serverError && (
        <div className="bg-danger-light text-danger-dark text-sm rounded-xl px-3.5 py-3 mb-4">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Label>Full name</Label>
        <Input placeholder="Alex Rivera" {...register('name')} className="mb-1" />
        <div className="mb-3">
          <FieldError>{errors.name?.message}</FieldError>
        </div>

        <Label>Email</Label>
        <Input type="email" placeholder="you@example.com" {...register('email')} className="mb-1" />
        <div className="mb-3">
          <FieldError>{errors.email?.message}</FieldError>
        </div>

        <Label>Password</Label>
        <Input
          type="password"
          placeholder="At least 10 characters"
          {...register('password')}
          className="mb-1"
        />
        <div className="mb-5">
          <FieldError>{errors.password?.message}</FieldError>
        </div>

        <Button type="submit" loading={isSubmitting} className="w-full">
          Create account
        </Button>
      </form>
      <p className="text-center text-ink-400 text-xs mt-3.5 leading-relaxed">
        By signing up you agree to our Terms &amp; Privacy Policy.
      </p>
      <p className="text-center text-ink-500 text-sm mt-4">
        Already have an account?{' '}
        <Link href="/login" className="text-brand-600 font-bold">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
