'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PageSpinner } from '@/components/spinner';
import { useAuthStore } from '@/lib/auth-store';

export default function RootPage() {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!hydrated) return;
    router.replace(accessToken ? '/dashboard' : '/login');
  }, [hydrated, accessToken, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-100">
      <PageSpinner />
    </div>
  );
}
