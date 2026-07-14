import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailQueueService } from '../notifications/email-queue.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@Injectable()
export class InstructorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueue: EmailQueueService,
    private readonly notifications: NotificationsService,
  ) {}

  async dashboard(tenantId: string, instructorId: string) {
    const courses = await this.prisma.course.findMany({
      where: { tenantId, instructorId },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        priceCents: true,
        currency: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      courses.map(async (course) => {
        const [enrollmentCount, revenue, ratingAgg, unansweredCount] =
          await Promise.all([
            this.prisma.enrollment.count({ where: { courseId: course.id } }),
            this.prisma.instructorPayoutLedgerEntry.aggregate({
              where: { instructorId, orderItem: { courseId: course.id } },
              _sum: { amountCents: true },
            }),
            this.prisma.review.aggregate({
              where: { courseId: course.id },
              _avg: { rating: true },
              _count: { rating: true },
            }),
            this.prisma.question.count({
              where: { courseId: course.id, answers: { none: {} } },
            }),
          ]);
        return {
          course,
          enrollmentCount,
          revenueCents: revenue._sum.amountCents ?? 0,
          ratingAvg: ratingAgg._avg.rating ?? 0,
          ratingCount: ratingAgg._count.rating,
          unansweredCount,
        };
      }),
    );
  }

  async courseAnalytics(
    tenantId: string,
    instructorId: string,
    courseId: string,
  ) {
    const course = await this.requireOwnCourse(
      tenantId,
      instructorId,
      courseId,
    );

    const [
      enrollmentCount,
      revenueAgg,
      payoutByStatus,
      ratingHistogram,
      recentEnrollments,
    ] = await Promise.all([
      this.prisma.enrollment.count({ where: { courseId } }),
      this.prisma.instructorPayoutLedgerEntry.aggregate({
        where: { instructorId, orderItem: { courseId } },
        _sum: { amountCents: true },
      }),
      this.prisma.instructorPayoutLedgerEntry.groupBy({
        by: ['status'],
        where: { instructorId, orderItem: { courseId } },
        _sum: { amountCents: true },
      }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where: { courseId },
        _count: { rating: true },
      }),
      this.prisma.enrollment.findMany({
        where: { courseId },
        orderBy: { enrolledAt: 'desc' },
        take: 10,
        select: { enrolledAt: true, user: { select: { name: true } } },
      }),
    ]);

    const histogram: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of ratingHistogram)
      histogram[row.rating] = row._count.rating;

    return {
      course: { id: course.id, title: course.title, status: course.status },
      enrollmentCount,
      totalRevenueCents: revenueAgg._sum.amountCents ?? 0,
      revenueByPayoutStatus: Object.fromEntries(
        payoutByStatus.map((p) => [p.status, p._sum.amountCents ?? 0]),
      ),
      ratingHistogram: histogram,
      recentEnrollments,
    };
  }

  /** Unanswered questions across every course this instructor teaches, oldest first — an
   *  inbox is only useful sorted by what's been waiting longest. */
  async questionsInbox(tenantId: string, instructorId: string) {
    return this.prisma.question.findMany({
      where: { tenantId, course: { instructorId }, answers: { none: {} } },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true } },
        course: { select: { id: true, title: true, slug: true } },
        lecture: { select: { id: true, title: true } },
      },
    });
  }

  async createAnnouncement(
    tenantId: string,
    instructorId: string,
    courseId: string,
    dto: CreateAnnouncementDto,
  ) {
    await this.requireOwnCourse(tenantId, instructorId, courseId);

    const announcement = await this.prisma.announcement.create({
      data: {
        tenantId,
        courseId,
        instructorId,
        title: dto.title,
        body: dto.body,
      },
    });

    const [course, enrolledStudents] = await Promise.all([
      this.prisma.course.findUniqueOrThrow({
        where: { id: courseId },
        select: { title: true, slug: true },
      }),
      this.prisma.enrollment.findMany({
        where: { courseId },
        include: { user: { select: { id: true, email: true, name: true } } },
      }),
    ]);

    await Promise.all(
      enrolledStudents.map(async (enrollment) => {
        await this.notifications.create(
          tenantId,
          enrollment.userId,
          'COURSE_ANNOUNCEMENT',
          {
            courseId,
            announcementId: announcement.id,
          },
        );
        await this.emailQueue.enqueue({
          type: 'course-announcement',
          to: enrollment.user.email,
          name: enrollment.user.name,
          courseTitle: course.title,
          announcementTitle: dto.title,
          courseUrl: `/courses/${course.slug}`,
        });
      }),
    );

    return announcement;
  }

  private async requireOwnCourse(
    tenantId: string,
    instructorId: string,
    courseId: string,
  ) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, tenantId },
    });
    if (!course) throw new NotFoundException('Course not found.');
    if (course.instructorId !== instructorId)
      throw new ForbiddenException('You do not own this course.');
    return course;
  }
}
