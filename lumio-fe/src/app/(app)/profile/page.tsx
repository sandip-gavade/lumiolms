'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/button';
import { useToast } from '@/components/toast';
import { forgotPassword, logout as apiLogout } from '@/lib/api/auth';
import { listNotifications, markNotificationRead } from '@/lib/api/notifications';
import { useAuthStore } from '@/lib/auth-store';
import { initialsOf, relativeTime } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';

const NOTIFICATION_LABELS: Record<string, string> = {
  QA_REPLY: 'Someone replied to your question',
  COURSE_ANNOUNCEMENT: 'New course announcement',
  SALE: 'A course you liked is on sale',
  RESUME_REMINDER: 'Pick up where you left off',
  CERTIFICATE_READY: 'Your certificate is ready',
};

export default function ProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user, refreshToken, clear } = useAuthStore();
  const [resetSent, setResetSent] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: listNotifications,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });

  async function handleSendReset() {
    if (!user) return;
    await forgotPassword(user.email).catch(() => {});
    setResetSent(true);
    toast.show('Password reset email sent.');
  }

  async function handleLogout() {
    if (refreshToken) await apiLogout(refreshToken).catch(() => {});
    clear();
    router.push('/login');
  }

  if (!user) return null;

  const unread = notifications?.filter((n) => !n.readAt) ?? [];

  return (
    <div className="max-w-[840px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 animate-fadeUp">
      <h1 className="font-display font-extrabold text-[clamp(26px,3vw,34px)] tracking-tight text-ink-800 mb-6">
        Profile &amp; Settings
      </h1>

      <div className="bg-white border border-ink-200 rounded-2xl p-6 mb-5.5 flex flex-wrap gap-5.5 items-center">
        <div
          className="w-[84px] h-[84px] rounded-full text-white flex items-center justify-center font-bold text-[32px] font-display shrink-0"
          style={{ background: '#4F46E5' }}
        >
          {initialsOf(user.name)}
        </div>
        <div className="flex-1 basis-[240px] min-w-0">
          <div className="font-display font-extrabold text-xl text-ink-800">{user.name}</div>
          <div className="text-sm text-ink-500">{user.email}</div>
        </div>
      </div>

      <div className="bg-white border border-ink-200 rounded-2xl p-6 mb-5.5">
        <h2 className="font-display font-extrabold text-lg mb-1">Password</h2>
        <p className="text-sm text-ink-500 mb-4">
          For security, password changes go through a verification email rather than an in-app
          form.
        </p>
        <Button variant="secondary" onClick={handleSendReset} disabled={resetSent}>
          {resetSent ? 'Reset email sent' : 'Send password reset email'}
        </Button>
      </div>

      <div className="bg-white border border-ink-200 rounded-2xl p-6 mb-5.5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display font-extrabold text-lg">Notifications</h2>
          {unread.length > 0 && (
            <button
              onClick={() => unread.forEach((n) => markReadMutation.mutate(n.id))}
              className="text-sm text-brand-600 font-bold"
            >
              Mark all read
            </button>
          )}
        </div>
        <p className="text-sm text-ink-400 mb-3">Course updates, Q&amp;A replies, and certificates.</p>
        {!notifications?.length && <div className="text-sm text-ink-400 py-6 text-center">No notifications yet.</div>}
        {notifications?.map((n) => (
          <div
            key={n.id}
            className="flex items-center gap-4 py-3.5 border-t border-ink-100 first:border-0"
          >
            <div className="flex-1 min-w-0">
              <div className={`text-[14.5px] ${n.readAt ? 'text-ink-500' : 'font-bold text-ink-800'}`}>
                {NOTIFICATION_LABELS[n.type] ?? n.type}
              </div>
              <div className="text-xs text-ink-400 mt-0.5">{relativeTime(n.createdAt)}</div>
            </div>
            {!n.readAt && (
              <button
                onClick={() => markReadMutation.mutate(n.id)}
                className="text-xs text-brand-600 font-bold shrink-0"
              >
                Mark read
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 justify-between items-center bg-white border border-ink-200 rounded-2xl p-5 px-6">
        <div>
          <div className="font-display font-bold text-[15px] text-ink-800">Sign out of lumio</div>
          <div className="text-[13px] text-ink-400">You can always log back in to pick up where you left off.</div>
        </div>
        <Button variant="danger" onClick={handleLogout}>
          Log out
        </Button>
      </div>
    </div>
  );
}
