import { apiFetch } from './client';
import type { AuthResult } from '../types';

export function signup(input: { email: string; password: string; name: string }) {
  return apiFetch<AuthResult>('/auth/signup', { method: 'POST', body: input, auth: false });
}

export function login(input: { email: string; password: string }) {
  return apiFetch<AuthResult>('/auth/login', { method: 'POST', body: input, auth: false });
}

export function loginWithGoogle(idToken: string) {
  return apiFetch<AuthResult>('/auth/google', {
    method: 'POST',
    body: { idToken },
    auth: false,
  });
}

export function logout(refreshToken: string) {
  return apiFetch<void>('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false });
}

export function forgotPassword(email: string) {
  return apiFetch<void>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
    auth: false,
  });
}

export function resetPassword(input: { token: string; newPassword: string }) {
  return apiFetch<void>('/auth/reset-password', { method: 'POST', body: input, auth: false });
}

export function verifyEmail(token: string) {
  return apiFetch<void>('/auth/verify-email', { method: 'POST', body: { token }, auth: false });
}

export function me() {
  return apiFetch<{
    userId: string;
    tenantId: string | null;
    roles: string[];
    isSuperAdmin: boolean;
  }>('/auth/me');
}
