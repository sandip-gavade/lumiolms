'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Navbar } from '@/components/navbar';
import { PageSpinner } from '@/components/spinner';
import { useAuthStore } from '@/lib/auth-store';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (hydrated && !accessToken) {
      router.replace('/login');
    }
  }, [hydrated, accessToken, router]);

  if (!hydrated || !accessToken) {
    return (
      <div className="min-h-screen flex flex-col bg-ink-100">
        <PageSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-ink-100">
      <Navbar />
      <div className="flex-1 flex flex-col min-h-0">{children}</div>
    </div>
  );
}
