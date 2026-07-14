import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrgAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(tenantId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    // One row per user, roles collapsed into an array — a user can hold more than one
    // Membership row in this tenant (e.g. STUDENT + INSTRUCTOR).
    const byUser = new Map<
      string,
      {
        user: (typeof memberships)[number]['user'];
        roles: string[];
        status: string;
      }
    >();
    for (const m of memberships) {
      const existing = byUser.get(m.userId);
      if (existing) {
        existing.roles.push(m.role);
        if (m.status === 'ACTIVE') existing.status = 'ACTIVE'; // any active membership counts as active
      } else {
        byUser.set(m.userId, {
          user: m.user,
          roles: [m.role],
          status: m.status,
        });
      }
    }
    return Array.from(byUser.values());
  }

  async setUserSuspension(
    tenantId: string,
    actorId: string,
    targetUserId: string,
    suspended: boolean,
  ) {
    if (targetUserId === actorId) {
      throw new BadRequestException('You cannot suspend your own account.');
    }
    const memberships = await this.prisma.membership.findMany({
      where: { tenantId, userId: targetUserId },
    });
    if (memberships.length === 0)
      throw new NotFoundException('User is not a member of this organization.');

    await this.prisma.membership.updateMany({
      where: { tenantId, userId: targetUserId },
      data: { status: suspended ? 'SUSPENDED' : 'ACTIVE' },
    });
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorUserId: actorId,
        action: suspended ? 'user.suspend' : 'user.reinstate',
        targetType: 'User',
        targetId: targetUserId,
        metadata: {},
      },
    });
  }

  async analytics(tenantId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalSignupsLast30d,
      revenueAgg,
      activeLearnerIds,
      topCoursesRaw,
    ] = await Promise.all([
      this.prisma.membership
        .findMany({
          where: { tenantId },
          distinct: ['userId'],
          select: { userId: true },
        })
        .then((r) => r.length),
      this.prisma.membership.count({
        where: { tenantId, createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.order.aggregate({
        where: { tenantId, status: 'PAID' },
        _sum: { totalCents: true },
      }),
      this.prisma.lectureProgress.findMany({
        where: { tenantId, updatedAt: { gte: thirtyDaysAgo } },
        distinct: ['userId'],
        select: { userId: true },
      }),
      this.prisma.enrollment.groupBy({
        by: ['courseId'],
        where: { tenantId },
        _count: { courseId: true },
        orderBy: { _count: { courseId: 'desc' } },
        take: 5,
      }),
    ]);

    const topCourses = await Promise.all(
      topCoursesRaw.map(async (row) => {
        const course = await this.prisma.course.findUnique({
          where: { id: row.courseId },
          select: { id: true, title: true, slug: true },
        });
        return { course, enrollmentCount: row._count.courseId };
      }),
    );

    return {
      totalUsers,
      newMembershipsLast30d: totalSignupsLast30d,
      totalRevenueCents: revenueAgg._sum.totalCents ?? 0,
      activeLearnersLast30d: activeLearnerIds.length,
      topCourses,
    };
  }
}
