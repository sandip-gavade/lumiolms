import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { getRequestContext } from '../tenant-context';

/**
 * Distinct from RolesGuard: @Roles(...) treats isSuperAdmin as an auto-pass alongside any
 * listed tenant role, so it can't express "super-admin only" — a route an org-admin should
 * never reach even though they'd pass a @Roles('ORG_ADMIN') check. Run after JwtAuthGuard.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    const { isSuperAdmin } = getRequestContext();
    if (!isSuperAdmin) {
      throw new ForbiddenException(
        'This action requires platform super-admin access.',
      );
    }
    return true;
  }
}
