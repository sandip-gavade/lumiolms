'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Input } from '@/components/input';
import { PageSpinner, Spinner } from '@/components/spinner';
import { useToast } from '@/components/toast';
import { getCart, removeFromCart } from '@/lib/api/cart';
import { checkout } from '@/lib/api/checkout';
import { ApiError } from '@/lib/api/client';
import { money } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { gradientFor, monogramOf } from '@/lib/visuals';
import { useRouter } from 'next/navigation';

function CartContent() {
  const searchParams = useSearchParams();
  const cancelled = searchParams.get('checkout') === 'cancelled';
  const queryClient = useQueryClient();
  const toast = useToast();
  const router = useRouter();
  const [couponCode, setCouponCode] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);

  const { data: cart, isLoading } = useQuery({ queryKey: queryKeys.cart, queryFn: getCart });

  const removeMutation = useMutation({
    mutationFn: (courseId: string) => removeFromCart(courseId),
    onSuccess: (data) => queryClient.setQueryData(queryKeys.cart, data),
    onError: (err) => toast.show(err instanceof ApiError ? err.message : 'Could not remove item.', 'error'),
  });

  async function handleCheckout() {
    setCheckingOut(true);
    try {
      const result = await checkout(couponCode.trim() || undefined);
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.cart });
      queryClient.invalidateQueries({ queryKey: queryKeys.myLearning });
      router.push(`/orders/${result.orderId}?checkout=success`);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Checkout failed. Please try again.', 'error');
    } finally {
      setCheckingOut(false);
    }
  }

  if (isLoading || !cart) return <PageSpinner />;

  return (
    <div className="max-w-[900px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 animate-fadeUp">
      <h1 className="font-display font-extrabold text-[clamp(26px,3vw,34px)] tracking-tight text-ink-800 mb-6">
        Your cart
      </h1>

      {cancelled && (
        <div className="bg-amber-500/10 text-amber-700 text-sm rounded-xl px-4 py-3 mb-5">
          Checkout was cancelled — your cart is still here whenever you&apos;re ready.
        </div>
      )}

      {cart.items.length === 0 ? (
        <EmptyState
          icon="🛒"
          title="Your cart is empty"
          description="Browse the catalog to find your next course."
          action={
            <Link href="/catalog">
              <Button>Browse courses</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 flex flex-col gap-3.5 w-full">
            {cart.items.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-ink-200 rounded-2xl p-4 flex items-center gap-4"
              >
                <div
                  className="w-[100px] h-[64px] rounded-xl relative shrink-0 flex items-end p-2 overflow-hidden"
                  style={{ background: gradientFor(item.courseId) }}
                >
                  <span className="text-white/35 font-display font-extrabold text-lg">
                    {monogramOf(item.course.title)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/courses/${item.course.slug}`}
                    className="font-display font-bold text-[15px] text-ink-800 hover:text-brand-600 line-clamp-2"
                  >
                    {item.course.title}
                  </Link>
                  <div className="font-display font-bold text-ink-800 mt-1">
                    {money(item.course.priceCents, item.course.currency)}
                  </div>
                </div>
                <button
                  onClick={() => removeMutation.mutate(item.courseId)}
                  disabled={removeMutation.isPending}
                  className="shrink-0 p-2 rounded-full hover:bg-danger-light text-ink-400 hover:text-danger-dark transition-colors"
                  aria-label="Remove from cart"
                >
                  {removeMutation.isPending && removeMutation.variables === item.courseId ? (
                    <Spinner size={16} />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            ))}
          </div>

          <aside className="w-full lg:w-[320px] shrink-0 bg-white border border-ink-200 rounded-2xl p-5">
            <div className="font-display font-bold text-[15px] mb-4">Order summary</div>
            <div className="flex justify-between text-sm text-ink-600 mb-3">
              <span>
                Subtotal ({cart.items.length} course{cart.items.length === 1 ? '' : 's'})
              </span>
              <span className="font-bold text-ink-800">{money(cart.subtotalCents)}</span>
            </div>
            <Input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Coupon code (optional)"
              className="mb-4 text-sm"
            />
            <Button className="w-full" loading={checkingOut} onClick={handleCheckout}>
              Checkout
            </Button>
            <div className="text-center text-[12.5px] text-ink-400 mt-3">
              30-day money-back guarantee
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <CartContent />
    </Suspense>
  );
}
