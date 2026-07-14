'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, Lock, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Button } from '@/components/button';
import { PageSpinner } from '@/components/spinner';
import { StarRating, InteractiveStarRating } from '@/components/star-rating';
import { Textarea } from '@/components/input';
import { useToast } from '@/components/toast';
import { addToCart, getCart } from '@/lib/api/cart';
import { getCourseBySlug, listReviews, upsertReview } from '@/lib/api/catalog';
import { getMyLearning } from '@/lib/api/learning';
import { checkout } from '@/lib/api/checkout';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth-store';
import { durationLabel, hoursLabel, initialsOf, levelLabel, money, relativeTime } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { avatarColorFor, gradientFor, monogramOf } from '@/lib/visuals';

export default function CourseDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [openSections, setOpenSections] = useState<number[]>([0]);
  const [checkingOut, setCheckingOut] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');

  const { data: course, isLoading } = useQuery({
    queryKey: queryKeys.course(slug),
    queryFn: () => getCourseBySlug(slug),
  });
  const { data: reviewsData } = useQuery({
    queryKey: course ? queryKeys.reviews(course.id) : ['reviews', 'pending'],
    queryFn: () => listReviews(course!.id),
    enabled: !!course,
  });
  const { data: myLearning } = useQuery({ queryKey: queryKeys.myLearning, queryFn: getMyLearning });
  const { data: cart } = useQuery({ queryKey: queryKeys.cart, queryFn: getCart });

  const addMutation = useMutation({
    mutationFn: (courseId: string) => addToCart(courseId),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.cart, data);
    },
    onError: (err) => {
      toast.show(err instanceof ApiError ? err.message : 'Could not add to cart.', 'error');
    },
  });

  const reviewMutation = useMutation({
    mutationFn: () =>
      upsertReview(course!.id, {
        rating: reviewRating,
        title: reviewTitle || undefined,
        body: reviewBody || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews(course!.id) });
      toast.show('Thanks for your review!');
    },
    onError: (err) => {
      toast.show(err instanceof ApiError ? err.message : 'Could not submit review.', 'error');
    },
  });

  const enrollment = useMemo(
    () => myLearning?.courses.find((c) => c.course.slug === slug),
    [myLearning, slug],
  );
  const inCart = useMemo(
    () => !!course && !!cart?.items.some((i) => i.courseId === course.id),
    [cart, course],
  );

  if (isLoading || !course) return <PageSpinner />;

  const totalSeconds = course.sections.reduce(
    (sum, s) => sum + s.lectures.reduce((ls, l) => ls + l.durationSeconds, 0),
    0,
  );
  const totalLectures = course.sections.reduce((sum, s) => sum + s.lectures.length, 0);

  async function handleAddToCart() {
    if (inCart) {
      router.push('/cart');
      return;
    }
    await addMutation.mutateAsync(course!.id);
    toast.show('Added to cart.');
  }

  async function handleEnrollNow() {
    setCheckingOut(true);
    try {
      if (!inCart) {
        await addMutation.mutateAsync(course!.id);
      }
      router.push('/cart');
    } finally {
      setCheckingOut(false);
    }
  }

  async function handleQuickCheckout() {
    setCheckingOut(true);
    try {
      if (!inCart) await addMutation.mutateAsync(course!.id);
      const result = await checkout();
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.cart });
        queryClient.invalidateQueries({ queryKey: queryKeys.myLearning });
        router.push(`/orders/${result.orderId}?checkout=success`);
      }
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Checkout failed.', 'error');
    } finally {
      setCheckingOut(false);
    }
  }

  const myReview = reviewsData?.reviews.find((r) => r.userId === user?.id);
  const ratingBars = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviewsData?.histogram[String(stars)] ?? 0;
    const total = reviewsData?.ratingCount ?? 0;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return { stars, pct };
  });

  return (
    <div className="animate-fadeUp">
      <div className="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 text-white px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        <div className="max-w-[1180px] mx-auto">
          <div className="flex items-center gap-2 text-[13px] text-white/60 mb-4">
            <Link href="/catalog" className="font-semibold hover:text-white">
              Browse
            </Link>
            <span>/</span>
            <span className="text-white/85">{course.category?.name ?? 'General'}</span>
          </div>
          <div className="max-w-[720px]">
            <h1 className="font-display font-extrabold text-[clamp(28px,3.6vw,40px)] leading-[1.12] tracking-tight mb-3.5">
              {course.title}
            </h1>
            <p className="text-[17px] leading-relaxed text-white/85 mb-5">{course.shortDesc}</p>
            <div className="flex flex-wrap items-center gap-x-4.5 gap-y-2 text-sm">
              {course.ratingCount > 0 ? (
                <span className="flex items-center gap-1.5">
                  <span className="font-bold text-amber-400">{course.ratingAvg.toFixed(1)}</span>
                  <StarRating rating={course.ratingAvg} />
                  <span className="text-white/70">({course.ratingCount} ratings)</span>
                </span>
              ) : (
                <span className="text-white/70">No ratings yet</span>
              )}
              <span className="inline-flex items-center gap-1.5 bg-white/[0.12] rounded-full px-3 py-1 font-semibold text-[12.5px]">
                {levelLabel(course.level)}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-5">
              <div
                className="w-[42px] h-[42px] rounded-full flex items-center justify-center font-bold font-display text-[15px]"
                style={{ background: '#4F46E5' }}
              >
                {initialsOf(course.instructor.name)}
              </div>
              <div>
                <div className="text-[13px] text-white/70">Created by</div>
                <div className="font-bold text-[15px]">{course.instructor.name}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9 flex flex-wrap gap-8 items-start">
        <div className="flex-1 basis-[540px] min-w-0">
          {course.outcomes.length > 0 && (
            <div className="bg-white border border-ink-200 rounded-2xl p-6 mb-7">
              <h2 className="font-display font-extrabold text-[21px] tracking-tight mb-4.5">
                What you&apos;ll learn
              </h2>
              <div className="grid sm:grid-cols-2 gap-3.5 gap-x-6">
                {course.outcomes.map((o, i) => (
                  <div key={i} className="flex gap-2.5 items-start">
                    <Check size={19} className="text-brand-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span className="text-[14.5px] leading-snug text-ink-700">{o}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-end justify-between mb-4">
            <h2 className="font-display font-extrabold text-[21px] tracking-tight">Course content</h2>
            <span className="text-[13.5px] text-ink-500">
              {course.sections.length} sections · {totalLectures} lectures · {hoursLabel(totalSeconds)}
            </span>
          </div>
          <div className="border border-ink-200 rounded-2xl overflow-hidden mb-7 bg-white">
            {course.sections.map((sec, i) => {
              const open = openSections.includes(i);
              const secSeconds = sec.lectures.reduce((s, l) => s + l.durationSeconds, 0);
              return (
                <div key={sec.id} className="border-b border-ink-100 last:border-0">
                  <button
                    onClick={() =>
                      setOpenSections((prev) =>
                        prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
                      )
                    }
                    className="w-full flex items-center gap-3 bg-ink-50 border-none px-4.5 py-3.5 cursor-pointer text-left"
                  >
                    <ChevronDown
                      size={16}
                      className={`transition-transform text-ink-800 opacity-50 ${open ? 'rotate-180' : ''}`}
                    />
                    <span className="font-display font-bold text-[15px] text-ink-800 flex-1">
                      {sec.title}
                    </span>
                    <span className="text-[13px] text-ink-500 shrink-0">
                      {sec.lectures.length} lectures · {durationLabel(secSeconds)}
                    </span>
                  </button>
                  {open && (
                    <div className="py-1">
                      {sec.lectures.map((lec) => {
                        const unlocked = !!enrollment || lec.isPreview;
                        return (
                          <div key={lec.id} className="flex items-center gap-3 px-4.5 pl-5.5 py-2.5">
                            {unlocked ? (
                              <PlayCircle size={17} className="shrink-0 opacity-55 text-ink-600" />
                            ) : (
                              <Lock size={15} className="shrink-0 opacity-45 text-ink-600" />
                            )}
                            <span className="flex-1 text-sm text-ink-700">{lec.title}</span>
                            {lec.isPreview && (
                              <span className="text-xs font-bold text-brand-600">Preview</span>
                            )}
                            <span className="text-[13px] text-ink-400 shrink-0">
                              {durationLabel(lec.durationSeconds)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <h2 className="font-display font-extrabold text-[21px] tracking-tight mb-3">Description</h2>
          <p className="text-[15.5px] leading-relaxed text-ink-700 mb-7 whitespace-pre-line">
            {course.longDesc}
          </p>

          <h2 className="font-display font-extrabold text-[21px] tracking-tight mb-4">Your instructor</h2>
          <div className="flex flex-wrap gap-4.5 items-start mb-8">
            <div
              className="w-[78px] h-[78px] rounded-full text-white flex items-center justify-center font-bold text-[28px] font-display shrink-0"
              style={{ background: '#4F46E5' }}
            >
              {initialsOf(course.instructor.name)}
            </div>
            <div className="flex-1 basis-[320px] min-w-0">
              <div className="font-display font-extrabold text-lg">{course.instructor.name}</div>
              <div className="text-sm text-brand-600 font-semibold mb-2">Course instructor</div>
            </div>
          </div>

          <h2 className="font-display font-extrabold text-[21px] tracking-tight mb-4.5">Student reviews</h2>
          <div className="flex flex-wrap gap-7 items-center mb-6">
            <div className="text-center shrink-0">
              <div className="font-display font-extrabold text-[54px] leading-none text-ink-800">
                {course.ratingAvg.toFixed(1)}
              </div>
              <div className="my-1.5">
                <StarRating rating={course.ratingAvg} size={17} />
              </div>
              <div className="text-[13px] text-ink-500">{course.ratingCount} ratings</div>
            </div>
            <div className="flex-1 basis-[280px] min-w-0 flex flex-col gap-2">
              {ratingBars.map((b) => (
                <div key={b.stars} className="flex items-center gap-2.5">
                  <span className="text-[12.5px] text-ink-400 w-[42px] shrink-0">{b.stars} star</span>
                  <div className="flex-1 h-2 bg-ink-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${b.pct}%` }} />
                  </div>
                  <span className="text-[12.5px] text-ink-400 w-[38px] text-right shrink-0">{b.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {enrollment && (
            <div className="bg-white border border-ink-200 rounded-2xl p-5 mb-6">
              <div className="font-display font-bold text-[15px] mb-3">
                {myReview ? 'Update your review' : 'Leave a review'}
              </div>
              <InteractiveStarRating
                value={reviewRating || myReview?.rating || 0}
                onChange={setReviewRating}
              />
              <input
                value={reviewTitle || myReview?.title || ''}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="Review title (optional)"
                className="w-full border border-ink-200 rounded-[10px] px-3.5 py-2.5 text-sm outline-none mt-3.5 mb-3"
              />
              <Textarea
                value={reviewBody || myReview?.body || ''}
                onChange={(e) => setReviewBody(e.target.value)}
                placeholder="Share your thoughts about this course..."
                rows={3}
              />
              <div className="flex justify-end mt-3">
                <Button
                  size="sm"
                  loading={reviewMutation.isPending}
                  disabled={!(reviewRating || myReview?.rating)}
                  onClick={() => reviewMutation.mutate()}
                >
                  Submit review
                </Button>
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            {reviewsData?.reviews.map((rv) => (
              <div key={rv.id} className="bg-white border border-ink-200 rounded-2xl p-4.5">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div
                    className="w-[38px] h-[38px] rounded-full text-white flex items-center justify-center font-bold text-sm font-display"
                    style={{ background: avatarColorFor(rv.userId) }}
                  >
                    {initialsOf(rv.user.name)}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-ink-800">{rv.user.name}</div>
                    <div className="text-xs text-ink-400">{relativeTime(rv.createdAt)}</div>
                  </div>
                </div>
                <div className="mb-1.5">
                  <StarRating rating={rv.rating} />
                </div>
                {rv.title && (
                  <div className="font-display font-bold text-[14.5px] mb-1 text-ink-800">{rv.title}</div>
                )}
                {rv.body && <p className="text-sm leading-relaxed text-ink-600">{rv.body}</p>}
              </div>
            ))}
            {reviewsData?.reviews.length === 0 && (
              <div className="text-sm text-ink-400 sm:col-span-2">No reviews yet — be the first!</div>
            )}
          </div>
        </div>

        <aside className="w-full lg:w-[340px] lg:shrink-0 lg:sticky lg:top-[84px]">
          <div className="bg-white border border-ink-200 rounded-2xl overflow-hidden shadow-card-lg">
            <div
              className="h-[170px] relative flex items-center justify-center"
              style={{ background: gradientFor(course.id) }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: 'radial-gradient(circle at 75% 20%, rgba(255,255,255,0.24), transparent 55%)',
                }}
              />
              <span className="absolute bottom-3 left-4 font-display font-extrabold text-[32px] text-white/30">
                {monogramOf(course.title)}
              </span>
            </div>
            <div className="p-5.5">
              {enrollment ? (
                <>
                  <div className="mb-4">
                    <div className="flex justify-between text-[13px] font-bold mb-1.5">
                      <span className="text-success">You&apos;re enrolled</span>
                      <span className="text-brand-600">{enrollment.percent}%</span>
                    </div>
                    <div className="h-2 bg-brand-50 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-500 to-brand-700 rounded-lg"
                        style={{ width: `${enrollment.percent}%` }}
                      />
                    </div>
                  </div>
                  <Link href={`/learn/${course.slug}`}>
                    <Button className="w-full">Resume learning →</Button>
                  </Link>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-2.5 mb-4">
                    <span className="font-display font-extrabold text-[32px] tracking-tight text-ink-800">
                      {money(course.priceCents, course.currency)}
                    </span>
                  </div>
                  <Button
                    className="w-full mb-2.5"
                    loading={checkingOut}
                    onClick={handleQuickCheckout}
                  >
                    Enroll now
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full"
                    loading={addMutation.isPending}
                    onClick={handleAddToCart}
                  >
                    {inCart ? 'Go to cart' : 'Add to cart'}
                  </Button>
                  <div className="text-center text-[12.5px] text-ink-400 mt-3">
                    30-day money-back guarantee
                  </div>
                </>
              )}
              <div className="h-px bg-ink-100 my-4.5" />
              <div className="font-display font-bold text-[13.5px] mb-3 text-ink-800">
                This course includes
              </div>
              <div className="flex flex-col gap-2.5 text-[13.5px] text-ink-600">
                <IncludeRow icon="🎬" label={`${hoursLabel(totalSeconds)} of on-demand video`} />
                <IncludeRow icon="∞" label="Full lifetime access" />
                <IncludeRow icon="📱" label="Access on mobile and desktop" />
                <IncludeRow icon="🏆" label="Certificate of completion" />
                <IncludeRow icon="💬" label="Instructor Q&A support" />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function IncludeRow({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[15px] w-[18px] text-center">{icon}</span>
      {label}
    </div>
  );
}
