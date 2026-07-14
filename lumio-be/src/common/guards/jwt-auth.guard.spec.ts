import { UnauthorizedException } from '@nestjs/common';
import { requestContextStorage } from '../tenant-context';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const guard = new JwtAuthGuard();

  it('passes when the request context has a userId', () => {
    const result = requestContextStorage.run(
      { tenantId: 't1', userId: 'u1', roles: [], isSuperAdmin: false },
      () => guard.canActivate({} as any),
    );
    expect(result).toBe(true);
  });

  it('rejects when the request context has no userId (no verified token)', () => {
    expect(() =>
      requestContextStorage.run(
        { tenantId: 't1', userId: null, roles: [], isSuperAdmin: false },
        () => guard.canActivate({} as any),
      ),
    ).toThrow(UnauthorizedException);
  });
});
