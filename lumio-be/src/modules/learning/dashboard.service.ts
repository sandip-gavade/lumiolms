import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async myLearning(tenantId: string, userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { tenantId, userId },
      orderBy: { enrolledAt: 'desc' },
      include: {
        course: {
          select: { id: true, title: true, slug: true, thumbnailUrl: true },
        },
      },
    });

    const courses = await Promise.all(
      enrollments.map(async (enrollment) => {
        const [totalLectures, completedCount] = await Promise.all([
          this.prisma.lecture.count({
            where: { section: { courseId: enrollment.courseId } },
          }),
          this.prisma.lectureProgress.count({
            where: {
              userId,
              completedAt: { not: null },
              lecture: { section: { courseId: enrollment.courseId } },
            },
          }),
        ]);
        const percent =
          totalLectures === 0
            ? 0
            : Math.round((completedCount / totalLectures) * 100);
        return {
          course: enrollment.course,
          enrolledAt: enrollment.enrolledAt,
          totalLectures,
          completedCount,
          percent,
          status: percent === 100 ? 'completed' : 'in_progress',
        };
      }),
    );

    const [streakDays, recentActivity, recommended] = await Promise.all([
      this.computeStreakDays(userId),
      this.recentActivity(tenantId, userId),
      this.recommended(
        tenantId,
        userId,
        enrollments.map((e) => e.courseId),
      ),
    ]);

    return {
      courses,
      inProgressCount: courses.filter((c) => c.status === 'in_progress').length,
      completedCount: courses.filter((c) => c.status === 'completed').length,
      streakDays,
      recentActivity,
      recommended,
    };
  }

  /** Consecutive days, walking back from today, with at least one lecture completion — a UTC
   *  calendar day, matching how the completedAt timestamps are stored (no per-tenant
   *  timezone concept exists yet). */
  private async computeStreakDays(userId: string): Promise<number> {
    const completions = await this.prisma.lectureProgress.findMany({
      where: { userId, completedAt: { not: null } },
      select: { completedAt: true },
      orderBy: { completedAt: 'desc' },
      take: 400, // plenty for any realistic streak; avoids scanning a user's entire history
    });
    const activeDays = new Set(
      completions.map((c) => c.completedAt!.toISOString().slice(0, 10)),
    );

    let streak = 0;
    const cursor = new Date();
    cursor.setUTCHours(0, 0, 0, 0);
    while (activeDays.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    return streak;
  }

  private async recentActivity(tenantId: string, userId: string) {
    const [completions, enrollments] = await Promise.all([
      this.prisma.lectureProgress.findMany({
        where: { userId, completedAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        take: 10,
        include: {
          lecture: {
            select: {
              title: true,
              section: {
                select: { course: { select: { title: true, slug: true } } },
              },
            },
          },
        },
      }),
      this.prisma.enrollment.findMany({
        where: { tenantId, userId },
        orderBy: { enrolledAt: 'desc' },
        take: 10,
        include: { course: { select: { title: true, slug: true } } },
      }),
    ]);

    const events = [
      ...completions.map((c) => ({
        type: 'lecture_completed' as const,
        at: c.completedAt!,
        courseTitle: c.lecture.section.course.title,
        courseSlug: c.lecture.section.course.slug,
        lectureTitle: c.lecture.title,
      })),
      ...enrollments.map((e) => ({
        type: 'enrolled' as const,
        at: e.enrolledAt,
        courseTitle: e.course.title,
        courseSlug: e.course.slug,
      })),
    ];

    return events.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 10);
  }

  private async recommended(
    tenantId: string,
    userId: string,
    enrolledCourseIds: string[],
  ) {
    const categoryIds = enrolledCourseIds.length
      ? (
          await this.prisma.course.findMany({
            where: { id: { in: enrolledCourseIds }, categoryId: { not: null } },
            select: { categoryId: true },
            distinct: ['categoryId'],
          })
        ).map((c) => c.categoryId!)
      : [];

    return this.prisma.course.findMany({
      where: {
        tenantId,
        status: 'PUBLISHED',
        id: { notIn: enrolledCourseIds },
        ...(categoryIds.length ? { categoryId: { in: categoryIds } } : {}),
      },
      select: {
        id: true,
        title: true,
        slug: true,
        thumbnailUrl: true,
        priceCents: true,
        currency: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });
  }
}
