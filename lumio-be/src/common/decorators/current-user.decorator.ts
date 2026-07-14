import { createParamDecorator } from '@nestjs/common';
import { getRequestContext } from '../tenant-context';

export interface CurrentUserPayload {
  userId: string;
  tenantId: string | null;
  roles: string[];
  isSuperAdmin: boolean;
}

/** Reads identity from the AsyncLocalStorage request context rather than `request.user` —
 *  consistent with how PrismaService's tenant scoping reads the same context. Use behind
 *  JwtAuthGuard; userId is guaranteed non-null there. */
export const CurrentUser = createParamDecorator((): CurrentUserPayload => {
  const { userId, tenantId, roles, isSuperAdmin } = getRequestContext();
  return { userId: userId!, tenantId, roles, isSuperAdmin };
});
