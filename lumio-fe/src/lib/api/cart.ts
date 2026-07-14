import { apiFetch } from './client';
import type { CartResponse } from '../types';

export function getCart() {
  return apiFetch<CartResponse>('/cart');
}

export function addToCart(courseId: string) {
  return apiFetch<CartResponse>('/cart/items', { method: 'POST', body: { courseId } });
}

export function removeFromCart(courseId: string) {
  return apiFetch<CartResponse>(`/cart/items/${courseId}`, { method: 'DELETE' });
}
