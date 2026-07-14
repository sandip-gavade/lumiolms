'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/button';
import { PageSpinner } from '@/components/spinner';
import { listOrders } from '@/lib/api/checkout';
import { formatDate, money } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import type { OrderStatus } from '@/lib/types';

const STATUS_STYLES: Record<OrderStatus, string> = {
  PAID: 'bg-success-light text-success-dark',
  PENDING: 'bg-amber-500/15 text-amber-700',
  PARTIALLY_REFUNDED: 'bg-brand-50 text-brand-700',
  REFUNDED: 'bg-ink-100 text-ink-600',
  FAILED: 'bg-danger-light text-danger-dark',
};

export default function OrdersPage() {
  const { data: orders, isLoading } = useQuery({ queryKey: queryKeys.orders, queryFn: listOrders });

  if (isLoading || !orders) return <PageSpinner />;

  return (
    <div className="max-w-[900px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 animate-fadeUp">
      <h1 className="font-display font-extrabold text-[clamp(26px,3vw,34px)] tracking-tight text-ink-800 mb-6">
        Order history
      </h1>

      {orders.length === 0 ? (
        <EmptyState
          icon="🧾"
          title="No orders yet"
          description="Your purchases will show up here."
          action={
            <Link href="/catalog">
              <Button>Browse courses</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3.5">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="bg-white border border-ink-200 rounded-2xl p-4.5 flex flex-wrap items-center gap-4 hover:shadow-card transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs text-ink-400 mb-1">{formatDate(order.createdAt)}</div>
                <div className="text-sm text-ink-700 line-clamp-1">
                  {order.items.map((i) => i.course.title).join(', ')}
                </div>
              </div>
              <span
                className={`text-xs font-bold rounded-full px-3 py-1 shrink-0 ${STATUS_STYLES[order.status]}`}
              >
                {order.status.replace('_', ' ')}
              </span>
              <div className="font-display font-extrabold text-ink-800 shrink-0">
                {money(order.totalCents, order.currency)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
