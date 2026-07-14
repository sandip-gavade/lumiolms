import { SetMetadata } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Marks a route as requiring one of the given tenant-membership roles. Use alongside
 *  JwtAuthGuard + RolesGuard: `@UseGuards(JwtAuthGuard, RolesGuard) @Roles('ORG_ADMIN')`.
 *  A super-admin always passes, regardless of the roles listed. */
export const Roles = (...roles: MembershipRole[]) =>
  SetMetadata(ROLES_KEY, roles);
