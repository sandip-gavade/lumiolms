'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { PageSpinner } from '@/components/spinner';
import * as authApi from '@/lib/api/auth';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    authApi
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <AuthShell
      side={
        <h2 className="font-display font-extrabold text-[clamp(28px,3.4vw,40px)] leading-[1.1] tracking-tight">
          Confirming it&apos;s really you.
        </h2>
      }
    >
      <h1 className="font-display font-extrabold text-[30px] tracking-tight mb-5">Verify email</h1>
      {status === 'loading' && <PageSpinner />}
      {status === 'success' && (
        <div className="flex items-start gap-3 bg-success-light text-success-dark text-sm rounded-xl px-3.5 py-3.5">
          <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          <span>Your email is verified. You&apos;re all set.</span>
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-start gap-3 bg-danger-light text-danger-dark text-sm rounded-xl px-3.5 py-3.5">
          <XCircle size={18} className="shrink-0 mt-0.5" />
          <span>This verification link is invalid or has expired.</span>
        </div>
      )}
      <p className="text-center text-ink-500 text-sm mt-6">
        <Link href="/login" className="text-brand-600 font-bold">
          Continue to log in
        </Link>
      </p>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
