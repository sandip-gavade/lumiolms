'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getMyLearning } from '@/lib/api/learning';
import { listMyCertificates } from '@/lib/api/learning';
import { useAuthStore } from '@/lib/auth-store';
import { queryKeys } from '@/lib/query-keys';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { PageSpinner } from '@/components/spinner';
import { ContinueLearningCard, RecommendedCourseCard } from '@/components/learning-cards';
import { relativeTime } from '@/lib/format';

const ACTIVITY_ICON: Record<string, { icon: string; bg: string }> = {
  lecture_completed: { icon: '✅', bg: '#DCFCE7' },
  enrolled: { icon: '🎓', bg: '#EEF2FF' },
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useQuery({ queryKey: queryKeys.myLearning, queryFn: getMyLearning });
  const { data: certificates } = useQuery({
    queryKey: queryKeys.certificates,
    queryFn: listMyCertificates,
  });

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  if (isLoading || !data) return <PageSpinner />;

  const inProgress = data.courses.filter((c) => c.status === 'in_progress');

  const stats = [
    { label: 'Courses in progress', value: String(data.inProgressCount), delta: 'active', color: 'text-success' },
    { label: 'Completed', value: String(data.completedCount), delta: '🎉', color: 'text-success' },
    { label: 'Day streak', value: String(data.streakDays), delta: '🔥', color: 'text-amber-500' },
    { label: 'Certificates', value: String(certificates?.length ?? 0), delta: 'earned', color: 'text-ink-500' },
  ];

  return (
    <div className="max-w-[1180px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 animate-fadeUp">
      <div className="flex flex-wrap gap-4 items-end justify-between mb-7">
        <div>
          <div className="text-[13px] font-semibold text-brand-600 tracking-wide mb-1.5 uppercase">
            {today}
          </div>
          <h1 className="font-display font-extrabold text-[clamp(26px,3vw,34px)] tracking-tight text-ink-800">
            Welcome back, {user?.name.split(' ')[0]} 👋
          </h1>
          <p className="text-ink-500 text-[15px] mt-2">
            {data.streakDays > 0
              ? `You're on a ${data.streakDays}-day streak. Keep the momentum going.`
              : 'Complete a lecture today to start your streak.'}
          </p>
        </div>
        <Link href="/catalog">
          <Button>Browse courses →</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-9">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-ink-200 rounded-2xl p-4.5 px-5 py-4.5">
            <div className="text-[13px] text-ink-500 font-semibold mb-2">{s.label}</div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-extrabold text-[26px] tracking-tight text-ink-800">
                {s.value}
              </span>
              <span className={`text-[13px] font-bold ${s.color}`}>{s.delta}</span>
            </div>
          </div>
        ))}
      </div>

      {inProgress.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-extrabold text-xl tracking-tight text-ink-800">
              Continue learning
            </h2>
            <Link href="/my-learning" className="text-sm text-brand-600 font-bold">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5 mb-10">
            {inProgress.slice(0, 3).map((entry) => (
              <ContinueLearningCard key={entry.course.id} entry={entry} />
            ))}
          </div>
        </>
      )}

      {inProgress.length === 0 && data.courses.length === 0 && (
        <div className="mb-10">
          <EmptyState
            icon="🎓"
            title="Start your first course"
            description="Browse the catalog and enroll in something you're excited to build."
            action={
              <Link href="/catalog">
                <Button>Browse courses</Button>
              </Link>
            }
          />
        </div>
      )}

      <div className="flex flex-wrap gap-6">
        <div className="flex-1 basis-[520px] min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-extrabold text-xl tracking-tight text-ink-800">
              Recommended for you
            </h2>
            <Link href="/catalog" className="text-sm text-brand-600 font-bold">
              See all
            </Link>
          </div>
          {data.recommended.length === 0 ? (
            <div className="text-sm text-ink-400">No recommendations yet — browse the catalog to get started.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {data.recommended.map((c) => (
                <RecommendedCourseCard key={c.id} course={c} />
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 basis-[280px] min-w-0">
          <h2 className="font-display font-extrabold text-xl tracking-tight text-ink-800 mb-4">
            Recent activity
          </h2>
          <div className="bg-white border border-ink-200 rounded-2xl px-4.5">
            {data.recentActivity.length === 0 && (
              <div className="py-8 text-center text-sm text-ink-400">
                Nothing here yet — start a lecture to see activity.
              </div>
            )}
            {data.recentActivity.map((a, i) => {
              const meta = ACTIVITY_ICON[a.type] ?? { icon: '📌', bg: '#F1F5F9' };
              const text =
                a.type === 'lecture_completed'
                  ? `You completed "${a.lectureTitle}" in ${a.courseTitle}`
                  : `You enrolled in ${a.courseTitle}`;
              return (
                <div key={i} className="flex gap-3 py-3.5 border-b border-ink-100 last:border-0">
                  <div
                    className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center shrink-0 text-[15px]"
                    style={{ background: meta.bg }}
                  >
                    {meta.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] text-ink-800 leading-snug">{text}</div>
                    <div className="text-xs text-ink-400 mt-0.5">{relativeTime(a.at)}</div>
                  </div>
                </div>
              );
            })}
            {data.recentActivity.length > 0 && (
              <div className="py-3.5 text-center">
                <span className="text-[13px] text-ink-400">That&apos;s everything for now</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
