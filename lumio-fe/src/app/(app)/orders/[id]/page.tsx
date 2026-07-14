'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Button } from '@/components/button';
import { PageSpinner } from '@/components/spinner';
import { useToast } from '@/components/toast';
import { getOrder, requestRefund } from '@/lib/api/checkout';
import { ApiError } from '@/lib/api/client';
import { formatDate, money } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { gradientFor, monogramOf } from '@/lib/visuals';

function OrderDetailContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const justPaid = searchParams.get('checkout') === 'success';
  const queryClient = useQueryClient();
  const toast = useToast();
  const [refundingItem, setRefundingItem] = useState<string | null>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: queryKeys.order(params.id),
    queryFn: () => getOrder(params.id),
  });

  const refundMutation = useMutation({
    mutationFn: (orderItemId?: string) => requestRefund(params.id, { orderItemId }),
    onSuccess: () => {
      toast.show('Refund requested — an admin will review it shortly.');
      queryClient.invalidateQueries({ queryKey: queryKeys.order(params.id) });
    },
    onError: (err) => {
      toast.show(err instanceof ApiError ? err.message : 'Could not request refund.', 'error');
    },
    onSettled: () => setRefundingItem(null),
  });

  if (isLoading || !order) return <PageSpinner />;

  return (
    <div className="max-w-[760px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 animate-fadeUp">
      {justPaid && order.status === 'PAID' && (
        <div className="flex items-center gap-2.5 bg-success-light text-success-dark text-sm rounded-xl px-4 py-3.5 mb-6">
          <CheckCircle2 size={18} />
          Payment successful — you&apos;re enrolled! Head to{' '}
          <Link href="/my-learning" className="font-bold underline">
            My Learning
          </Link>{' '}
          to get started.
        </div>
      )}

      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display font-extrabold text-2xl tracking-tight text-ink-800">Order details</h1>
        <span className="text-xs font-bold rounded-full px-3 py-1 bg-ink-100 text-ink-600">
          {order.status.replace('_', ' ')}
        </span>
      </div>
      <p className="text-sm text-ink-400 mb-6">
        Placed {formatDate(order.createdAt)} · Order #{order.id.slice(0, 8).toUpperCase()}
      </p>

      <div className="bg-white border border-ink-200 rounded-2xl divide-y divide-ink-100 mb-5">
        {order.items.map((item) => {
          const alreadyRefunded = item.refunds?.some((r) =>
            ['REQUESTED', 'APPROVED', 'PROCESSED'].includes(r.status),
          );
          return (
            <div key={item.id} className="p-4.5 flex items-center gap-4">
              <div
                className="w-[64px] h-[64px] rounded-xl relative shrink-0 flex items-center justify-center"
                style={{ background: gradientFor(item.courseId) }}
              >
                <span className="text-white/40 font-display font-extrabold text-lg">
                  {monogramOf(item.course.title)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/courses/${item.course.slug}`}
                  className="font-display font-bold text-[15px] text-ink-800 hover:text-brand-600 line-clamp-1"
                >
                  {item.course.title}
                </Link>
                <div className="text-sm text-ink-500 mt-1">{money(item.priceCents, order.currency)}</div>
              </div>
              {order.status === 'PAID' && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={alreadyRefunded}
                  loading={refundingItem === item.id && refundMutation.isPending}
                  onClick={() => {
                    setRefundingItem(item.id);
                    refundMutation.mutate(item.id);
                  }}
                >
                  {alreadyRefunded ? 'Refund requested' : 'Request refund'}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-ink-200 rounded-2xl p-5 text-sm">
        <div className="flex justify-between py-1.5">
          <span className="text-ink-500">Subtotal</span>
          <span className="text-ink-800">{money(order.subtotalCents, order.currency)}</span>
        </div>
        {order.discountCents > 0 && (
          <div className="flex justify-between py-1.5">
            <span className="text-ink-500">
              Discount {order.coupon ? `(${order.coupon.code})` : ''}
            </span>
            <span className="text-success">-{money(order.discountCents, order.currency)}</span>
          </div>
        )}
        <div className="flex justify-between py-1.5 pt-3 mt-1 border-t border-ink-100 font-display font-bold text-ink-800">
          <span>Total</span>
          <span>{money(order.totalCents, order.currency)}</span>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <OrderDetailContent />
    </Suspense>
  );
}
