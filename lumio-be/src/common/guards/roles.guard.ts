import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MembershipRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { getRequestContext } from '../tenant-context';

/** Run after JwtAuthGuard. Requires the current session to hold at least one of the roles
 *  declared via @Roles(...) on the route/controller — a super-admin always passes. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<MembershipRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const { roles, isSuperAdmin } = getRequestContext();
    if (isSuperAdmin) return true;
    if (roles.some((r) => required.includes(r as MembershipRole))) return true;

    throw new ForbiddenException(
      `Requires one of role(s): ${required.join(', ')}.`,
    );
  }
}
