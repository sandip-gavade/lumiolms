import { useAuthStore } from '../auth-store';
import type { AuthResult } from '../types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? '';

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Query;
  /** Attach the Authorization header and attempt refresh-on-401. Defaults to true. */
  auth?: boolean;
}

function buildUrl(path: string, query?: Query): string {
  const url = new URL(path.startsWith('http') ? path : `${API_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

// Refresh calls are de-duplicated across concurrent requests hitting 401 at once — every
// caller awaits the same in-flight refresh instead of each racing to rotate the same token.
let refreshPromise: Promise<string | null> | null = null;

async function refreshSession(): Promise<string | null> {
  const { refreshToken, setSession, clear } = useAuthStore.getState();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) throw new Error('refresh failed');
    const data: AuthResult = await res.json();
    setSession(data);
    return data.accessToken;
  } catch {
    clear();
    return null;
  }
}

async function performRequest(url: string, opts: RequestOptions): Promise<Response> {
  const { method = 'GET', body, auth = true } = opts;
  const headers: Record<string, string> = { 'x-tenant-id': TENANT_ID };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = useAuthStore.getState().accessToken;
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = buildUrl(path, opts.query);
  let res = await performRequest(url, opts);

  if (res.status === 401 && opts.auth !== false && useAuthStore.getState().refreshToken) {
    if (!refreshPromise) {
      refreshPromise = refreshSession().finally(() => {
        refreshPromise = null;
      });
    }
    const newToken = await refreshPromise;
    if (newToken) {
      res = await performRequest(url, opts);
    }
  }

  if (!res.ok) {
    let message = res.statusText || `Request failed with status ${res.status}`;
    let payload: unknown;
    try {
      payload = await res.json();
      const payloadMessage = (payload as { message?: string | string[] } | null)?.message;
      if (Array.isArray(payloadMessage)) message = payloadMessage.join(', ');
      else if (payloadMessage) message = payloadMessage;
    } catch {
      // non-JSON error body — keep statusText
    }
    throw new ApiError(res.status, message, payload);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
