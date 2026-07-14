'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { PageSpinner } from '@/components/spinner';
import { getMyLearning } from '@/lib/api/learning';
import { queryKeys } from '@/lib/query-keys';
import { gradientFor, monogramOf } from '@/lib/visuals';

type Filter = 'all' | 'progress' | 'completed';

export default function MyLearningPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const { data, isLoading } = useQuery({ queryKey: queryKeys.myLearning, queryFn: getMyLearning });

  if (isLoading || !data) return <PageSpinner />;

  const courses = data.courses.filter((c) =>
    filter === 'all' ? true : filter === 'progress' ? c.status === 'in_progress' : c.status === 'completed',
  );

  const TABS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div className="max-w-[1100px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 animate-fadeUp">
      <h1 className="font-display font-extrabold text-[clamp(26px,3vw,34px)] tracking-tight text-ink-800 mb-1.5">
        My Learning
      </h1>
      <p className="text-ink-500 text-[15px] mb-6">
        {data.courses.length} courses · {data.inProgressCount} in progress · {data.completedCount} completed
      </p>

      <div className="flex gap-2.5 flex-wrap mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`rounded-full px-4.5 py-2 font-bold text-[13.5px] border ${
              filter === t.key
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-ink-600 border-ink-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {courses.map((entry) => (
          <div
            key={entry.course.id}
            className="bg-white border border-ink-200 rounded-2xl p-4 flex flex-wrap gap-4.5 items-center"
          >
            <div
              className="w-[150px] h-[90px] rounded-xl relative shrink-0 flex items-end p-2.5 overflow-hidden"
              style={{ background: gradientFor(entry.course.id) }}
            >
              <span className="absolute top-2 left-3 font-display font-extrabold text-2xl text-white/35">
                {monogramOf(entry.course.title)}
              </span>
            </div>
            <div className="flex-1 basis-[280px] min-w-0">
              <div className="font-display font-bold text-[16.5px] text-ink-800 mb-0.5 line-clamp-1">
                {entry.course.title}
              </div>
              <div className="text-[13px] text-ink-500 mb-3">
                {entry.completedCount} / {entry.totalLectures} lessons
              </div>
              <div className="flex items-center gap-3 max-w-[420px]">
                <div className="flex-1 h-2 bg-brand-50 rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 to-brand-700 rounded-lg"
                    style={{ width: `${entry.percent}%` }}
                  />
                </div>
                <span className="text-[12.5px] font-bold text-brand-600 shrink-0">{entry.percent}%</span>
              </div>
            </div>
            <div className="shrink-0">
              <Link href={`/learn/${entry.course.slug}`}>
                <Button
                  className={
                    entry.status === 'completed' ? '!bg-success !shadow-none hover:!bg-success' : undefined
                  }
                >
                  {entry.status === 'completed' ? 'Review →' : 'Resume →'}
                </Button>
              </Link>
            </div>
          </div>
        ))}

        {courses.length === 0 && (
          <EmptyState
            icon="📚"
            title="Nothing here yet"
            description="Courses you enroll in will show up here."
            dashed
            action={
              <Link href="/catalog">
                <Button>Browse courses</Button>
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}
