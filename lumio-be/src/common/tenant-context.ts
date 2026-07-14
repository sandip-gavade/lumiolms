import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  tenantId: string | null;
  userId: string | null;
  /** This session's roles within `tenantId` (a user can hold more than one Membership role
   *  per tenant — see docs/requirements.md "User ↔ Tenant cardinality"). Empty when
   *  unauthenticated. */
  roles: string[];
  isSuperAdmin: boolean;
}

/**
 * Holds the current request's tenant/user identity for the lifetime of that request,
 * without threading it through every function call. Populated by TenantContextMiddleware
 * from the JWT before any controller/service code runs; read by PrismaService's tenant
 * extension on every query. See docs/requirements.md NFR-3.7 — this is the "enforced
 * centrally" mechanism, not a convention each query has to remember to apply.
 */
export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext {
  const ctx = requestContextStorage.getStore();
  if (!ctx) {
    throw new Error(
      'No request context available — this code ran outside an HTTP request/TenantContextMiddleware, or the middleware was not registered for this route.',
    );
  }
  return ctx;
}

export function getTenantId(): string {
  const { tenantId } = getRequestContext();
  if (!tenantId) {
    throw new Error(
      'No tenant resolved for this request — route requires a tenant context.',
    );
  }
  return tenantId;
}
