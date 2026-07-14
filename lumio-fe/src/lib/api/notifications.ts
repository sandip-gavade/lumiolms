import { apiFetch } from './client';
import type { Notification } from '../types';

export function listNotifications() {
  return apiFetch<Notification[]>('/notifications');
}

export function markNotificationRead(id: string) {
  return apiFetch<void>(`/notifications/${id}/read`, { method: 'POST' });
}
