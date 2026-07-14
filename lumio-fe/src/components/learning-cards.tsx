import Link from 'next/link';
import { money } from '@/lib/format';
import { gradientFor, monogramOf } from '@/lib/visuals';
import { ProgressBar } from './progress-bar';
import type { MyLearningCourseEntry, RecommendedCourse } from '@/lib/types';

export function ContinueLearningCard({ entry }: { entry: MyLearningCourseEntry }) {
  const remaining = entry.totalLectures - entry.completedCount;
  return (
    <Link
      href={`/learn/${entry.course.slug}`}
      className="group bg-white border border-ink-200 rounded-2xl overflow-hidden transition-all hover:shadow-card hover:-translate-y-0.5"
    >
      <div
        className="h-[120px] relative flex items-end p-3.5"
        style={{ background: gradientFor(entry.course.id) }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 80% 15%, rgba(255,255,255,0.22), transparent 55%)',
          }}
        />
        <span className="absolute top-3.5 right-4 font-display font-extrabold text-[34px] text-white/30 tracking-tight">
          {monogramOf(entry.course.title)}
        </span>
      </div>
      <div className="p-4 pt-4 pb-[18px]">
        <div className="font-display font-bold text-[15.5px] leading-snug mb-1.5 text-ink-800 line-clamp-2">
          {entry.course.title}
        </div>
        <div className="text-[13px] text-ink-500 mb-3.5">
          {remaining > 0 ? `${remaining} lecture${remaining === 1 ? '' : 's'} left` : 'Course complete'}
        </div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[12.5px] font-bold text-brand-600">{entry.percent}% complete</span>
          <span className="text-xs text-ink-400">
            {entry.completedCount}/{entry.totalLectures}
          </span>
        </div>
        <ProgressBar percent={entry.percent} className="h-full" />
      </div>
    </Link>
  );
}

export function RecommendedCourseCard({ course }: { course: RecommendedCourse }) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group bg-white border border-ink-200 rounded-2xl overflow-hidden transition-all hover:shadow-card hover:-translate-y-0.5"
    >
      <div className="h-24 relative flex items-end p-2.5" style={{ background: gradientFor(course.id) }}>
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 78% 18%, rgba(255,255,255,0.22), transparent 55%)',
          }}
        />
        <span className="absolute top-2.5 left-3 font-display font-extrabold text-2xl text-white/35">
          {monogramOf(course.title)}
        </span>
      </div>
      <div className="p-3.5 pt-3">
        <div className="font-display font-bold text-sm leading-tight mb-2 text-ink-800 line-clamp-2">
          {course.title}
        </div>
        <div className="font-display font-extrabold text-sm text-ink-800">
          {money(course.priceCents, course.currency)}
        </div>
      </div>
    </Link>
  );
}
