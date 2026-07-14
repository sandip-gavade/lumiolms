import { apiFetch } from './client';
import type { CheckoutResult, Order } from '../types';

export function checkout(couponCode?: string) {
  return apiFetch<CheckoutResult>('/checkout', {
    method: 'POST',
    body: couponCode ? { couponCode } : {},
  });
}

export function listOrders() {
  return apiFetch<Order[]>('/orders');
}

export function getOrder(id: string) {
  return apiFetch<Order>(`/orders/${id}`);
}

export function requestRefund(
  orderId: string,
  input: { orderItemId?: string; reason?: string } = {},
) {
  return apiFetch(`/orders/${orderId}/refund`, { method: 'POST', body: input });
}
