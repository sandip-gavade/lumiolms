import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthResult, AuthService } from '../auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  listTenants() {
    return this.prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async setTenantStatus(actorId: string, tenantId: string, active: boolean) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found.');

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: active ? 'ACTIVE' : 'SUSPENDED' },
    });
    await this.prisma.auditLog.create({
      data: {
        tenantId: null, // platform-level action, not scoped to the tenant it acts on
        actorUserId: actorId,
        action: active ? 'tenant.activate' : 'tenant.suspend',
        targetType: 'Tenant',
        targetId: tenantId,
        metadata: {},
      },
    });
    return updated;
  }

  async platformAnalytics() {
    const [tenantCount, activeTenantCount, totalUsers, revenueAgg] =
      await Promise.all([
        this.prisma.tenant.count(),
        this.prisma.tenant.count({ where: { status: 'ACTIVE' } }),
        this.prisma.user.count(),
        this.prisma.order.aggregate({
          where: { status: 'PAID' },
          _sum: { totalCents: true },
        }),
      ]);
    return {
      tenantCount,
      activeTenantCount,
      totalUsers,
      totalRevenueCents: revenueAgg._sum.totalCents ?? 0,
    };
  }

  /** Issues a session as `targetUserId`, scoped to one of their tenant memberships, for
   *  support purposes — always audit-logged (FR-7.3), never silent. */
  async impersonate(
    actorId: string,
    targetUserId: string,
    requestedTenantId?: string,
  ): Promise<AuthResult> {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!target) throw new NotFoundException('User not found.');

    const memberships = await this.prisma.membership.findMany({
      where: { userId: targetUserId, status: 'ACTIVE' },
    });
    const membership = requestedTenantId
      ? memberships.find((m) => m.tenantId === requestedTenantId)
      : memberships[0];
    if (!membership) {
      throw new BadRequestException(
        requestedTenantId
          ? 'That user has no active membership in the given tenant.'
          : 'That user has no active tenant membership to impersonate into.',
      );
    }
    if (!requestedTenantId && memberships.length > 1) {
      throw new BadRequestException(
        'This user belongs to multiple tenants — specify tenantId.',
      );
    }

    const roles = memberships
      .filter((m) => m.tenantId === membership.tenantId)
      .map((m) => m.role);
    const session = await this.auth.issueSession(
      target,
      membership.tenantId,
      roles,
    );

    await this.prisma.auditLog.create({
      data: {
        tenantId: membership.tenantId,
        actorUserId: actorId,
        action: 'user.impersonate',
        targetType: 'User',
        targetId: targetUserId,
        metadata: { impersonatedBy: actorId },
      },
    });
    return session;
  }
}
