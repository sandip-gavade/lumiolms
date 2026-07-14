import Link from 'next/link';
import { money } from '@/lib/format';
import { gradientFor, monogramOf } from '@/lib/visuals';
import { StarRating } from './star-rating';
import type { CourseListItem } from '@/lib/types';

export function CourseCard({ course }: { course: CourseListItem }) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group bg-white border border-ink-200 rounded-2xl overflow-hidden flex flex-col transition-all hover:shadow-card hover:-translate-y-0.5"
    >
      <div
        className="h-32 relative flex items-end p-3"
        style={{ background: gradientFor(course.id) }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 80% 16%, rgba(255,255,255,0.24), transparent 55%)',
          }}
        />
        <span className="relative font-display font-extrabold text-[30px] text-white/35 tracking-tight">
          {monogramOf(course.title)}
        </span>
      </div>
      <div className="p-4 pt-3.5 flex flex-col flex-1">
        <span className="text-[11.5px] font-bold text-brand-600 mb-1.5">
          {course.category?.name ?? 'General'}
        </span>
        <div className="font-display font-bold text-[15.5px] leading-tight mb-1 text-ink-800 line-clamp-2">
          {course.title}
        </div>
        <div className="text-[13px] text-ink-500 mb-2.5">{course.instructor.name}</div>
        <div className="flex items-center gap-1.5 mb-3">
          {course.ratingCount > 0 ? (
            <StarRating rating={course.ratingAvg} showValue size={12} />
          ) : (
            <span className="text-[12.5px] text-ink-400">No reviews yet</span>
          )}
        </div>
        <div className="mt-auto flex items-center justify-between">
          <span className="font-display font-extrabold text-[17px] text-ink-800">
            {money(course.priceCents, course.currency)}
          </span>
          <span className="text-xs text-ink-400">{course.level.replace('_', ' ').toLowerCase()}</span>
        </div>
      </div>
    </Link>
  );
}

export function CourseCardCompact({ course }: { course: CourseListItem }) {
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
        <div className="font-display font-bold text-sm leading-tight mb-1 text-ink-800 line-clamp-2">
          {course.title}
        </div>
        <div className="text-xs text-ink-500 mb-2">{course.instructor.name}</div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold">
            {course.ratingCount > 0 ? (
              <>
                <span className="text-amber-500">★</span> {course.ratingAvg.toFixed(1)}
              </>
            ) : (
              <span className="text-ink-400 font-medium">New</span>
            )}
          </span>
          <span className="font-display font-extrabold text-sm text-ink-800">
            {money(course.priceCents, course.currency)}
          </span>
        </div>
      </div>
    </Link>
  );
}
