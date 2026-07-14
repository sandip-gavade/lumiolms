import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { requestContextStorage } from '../tenant-context';
import { RolesGuard } from './roles.guard';

function runWithContext<T>(
  ctx: {
    tenantId: string | null;
    userId: string | null;
    roles: string[];
    isSuperAdmin: boolean;
  },
  fn: () => T,
): T {
  return requestContextStorage.run(ctx, fn);
}

function fakeExecutionContext(
  requiredRoles: string[] | undefined,
): ExecutionContext {
  return {
    getHandler: () => ({ __roles: requiredRoles }) as any,
    getClass: () => ({}) as any,
  } as ExecutionContext;
}

describe('RolesGuard', () => {
  function guardWith(requiredRoles: string[] | undefined) {
    const reflector = {
      getAllAndOverride: () => requiredRoles,
    } as unknown as Reflector;
    return new RolesGuard(reflector);
  }

  it('allows the request through when no roles are required', () => {
    const guard = guardWith(undefined);
    const result = runWithContext(
      { tenantId: 't1', userId: 'u1', roles: [], isSuperAdmin: false },
      () => guard.canActivate(fakeExecutionContext(undefined)),
    );
    expect(result).toBe(true);
  });

  it('allows a session holding one of the required roles', () => {
    const guard = guardWith(['ORG_ADMIN']);
    const result = runWithContext(
      {
        tenantId: 't1',
        userId: 'u1',
        roles: ['ORG_ADMIN'],
        isSuperAdmin: false,
      },
      () => guard.canActivate(fakeExecutionContext(['ORG_ADMIN'])),
    );
    expect(result).toBe(true);
  });

  it('rejects a session missing every required role', () => {
    const guard = guardWith(['ORG_ADMIN']);
    expect(() =>
      runWithContext(
        {
          tenantId: 't1',
          userId: 'u1',
          roles: ['STUDENT'],
          isSuperAdmin: false,
        },
        () => guard.canActivate(fakeExecutionContext(['ORG_ADMIN'])),
      ),
    ).toThrow(ForbiddenException);
  });

  it('always allows a super-admin, regardless of tenant roles', () => {
    const guard = guardWith(['ORG_ADMIN']);
    const result = runWithContext(
      { tenantId: 't1', userId: 'u1', roles: [], isSuperAdmin: true },
      () => guard.canActivate(fakeExecutionContext(['ORG_ADMIN'])),
    );
    expect(result).toBe(true);
  });
});
