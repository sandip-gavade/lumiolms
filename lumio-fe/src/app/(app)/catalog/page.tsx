'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { CourseCard } from '@/components/course-card';
import { PageSpinner } from '@/components/spinner';
import { Button } from '@/components/button';
import { listCategories, listCourses } from '@/lib/api/catalog';
import { queryKeys } from '@/lib/query-keys';
import type { CourseLevel } from '@/lib/types';

const PAGE_SIZE = 20;
const LEVELS: { value: CourseLevel; label: string }[] = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
  { value: 'ALL_LEVELS', label: 'All Levels' },
];
const SORT_OPTIONS = ['Newest', 'Highest Rated', 'Most Reviewed', 'Price: Low to High', 'Price: High to Low'] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

function CatalogContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [level, setLevel] = useState<CourseLevel | null>(null);
  const [sort, setSort] = useState<SortOption>('Newest');

  const { data: categories } = useQuery({ queryKey: queryKeys.categories, queryFn: listCategories });

  const filters = { q: search.trim() || undefined, categoryId: categoryId ?? undefined, level: level ?? undefined };

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: queryKeys.courses(filters),
    queryFn: ({ pageParam }) => listCourses({ ...filters, limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((sum, p) => sum + p.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const total = data?.pages[0]?.total ?? 0;

  const sorted = useMemo(() => {
    const copy = [...items];
    switch (sort) {
      case 'Highest Rated':
        return copy.sort((a, b) => b.ratingAvg - a.ratingAvg);
      case 'Most Reviewed':
        return copy.sort((a, b) => b.ratingCount - a.ratingCount);
      case 'Price: Low to High':
        return copy.sort((a, b) => a.priceCents - b.priceCents);
      case 'Price: High to Low':
        return copy.sort((a, b) => b.priceCents - a.priceCents);
      default:
        return copy;
    }
  }, [items, sort]);

  function clearFilters() {
    setSearch('');
    setCategoryId(null);
    setLevel(null);
  }

  return (
    <div className="max-w-[1180px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 animate-fadeUp">
      <div className="mb-6">
        <h1 className="font-display font-extrabold text-[clamp(26px,3vw,34px)] tracking-tight text-ink-800 mb-1.5">
          Browse courses
        </h1>
        <p className="text-ink-500 text-[15px]">
          Hands-on courses in code, design, data, photography and film.
        </p>
      </div>

      <div className="flex flex-wrap gap-7 items-start">
        <aside className="w-full lg:w-[230px] lg:shrink-0 lg:sticky lg:top-[84px]">
          <div className="bg-white border border-ink-200 rounded-2xl p-4.5">
            <div className="font-display font-bold text-[13px] text-ink-400 tracking-wide uppercase mb-3">
              Categories
            </div>
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => setCategoryId(null)}
                className={`text-left rounded-[9px] px-2.5 py-2 text-sm font-semibold ${
                  categoryId === null ? 'bg-brand-50 text-brand-600 font-bold' : 'text-ink-600 hover:bg-ink-50'
                }`}
              >
                All categories
              </button>
              {categories?.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className={`text-left rounded-[9px] px-2.5 py-2 text-sm font-semibold ${
                    categoryId === cat.id ? 'bg-brand-50 text-brand-600 font-bold' : 'text-ink-600 hover:bg-ink-50'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <div className="h-px bg-ink-100 my-4" />
            <div className="font-display font-bold text-[13px] text-ink-400 tracking-wide uppercase mb-3">
              Level
            </div>
            <div className="flex flex-col gap-2">
              {LEVELS.map((lv) => (
                <label key={lv.value} className="flex items-center gap-2.5 text-sm text-ink-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={level === lv.value}
                    onChange={() => setLevel(level === lv.value ? null : lv.value)}
                    className="w-[17px] h-[17px] rounded accent-brand-600"
                  />
                  {lv.label}
                </label>
              ))}
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-3 items-center mb-4.5">
            <div className="flex-1 basis-[240px] flex items-center bg-white border border-ink-200 rounded-[11px] px-3.5 h-[46px] min-w-0">
              <Search size={18} className="opacity-45 shrink-0 text-ink-600" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, instructor or topic"
                className="border-none outline-none bg-transparent text-[14.5px] ml-2.5 w-full min-w-0"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="h-[46px] border border-ink-200 rounded-[11px] px-3.5 text-sm font-semibold text-ink-700 bg-white cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm text-ink-500 mb-4">
            <strong className="text-ink-800">{total}</strong> courses
          </div>

          {isLoading ? (
            <PageSpinner />
          ) : sorted.length === 0 ? (
            <div className="text-center py-16 px-5 text-ink-400">
              <div className="text-4xl mb-3">🔍</div>
              <div className="font-bold text-ink-600 text-base mb-1.5">No courses match your filters</div>
              <button
                onClick={clearFilters}
                className="mt-2.5 bg-brand-50 text-brand-600 border-none rounded-[9px] px-4 py-2.5 font-bold cursor-pointer"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4.5">
                {sorted.map((c) => (
                  <CourseCard key={c.id} course={c} />
                ))}
              </div>
              {hasNextPage && (
                <div className="flex justify-center mt-8">
                  <Button variant="secondary" loading={isFetchingNextPage} onClick={() => fetchNextPage()}>
                    Load more courses
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <CatalogContent />
    </Suspense>
  );
}
