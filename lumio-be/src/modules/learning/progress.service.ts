import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CertificatesService } from './certificates.service';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { EnrollmentGuard } from './enrollment.util';

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollmentGuard: EnrollmentGuard,
    private readonly certificates: CertificatesService,
  ) {}

  async updateLectureProgress(
    tenantId: string,
    userId: string,
    lectureId: string,
    dto: UpdateProgressDto,
  ) {
    const lecture = await this.prisma.lecture.findUnique({
      where: { id: lectureId },
      include: { section: { select: { courseId: true } } },
    });
    if (!lecture) throw new NotFoundException('Lecture not found.');
    const courseId = lecture.section.courseId;
    await this.enrollmentGuard.requireEnrollment(tenantId, userId, courseId);

    const existing = await this.prisma.lectureProgress.findUnique({
      where: { userId_lectureId: { userId, lectureId } },
    });
    const completedAt =
      dto.completed === undefined
        ? (existing?.completedAt ?? null)
        : dto.completed
          ? (existing?.completedAt ?? new Date())
          : null;

    const progress = await this.prisma.lectureProgress.upsert({
      where: { userId_lectureId: { userId, lectureId } },
      create: {
        tenantId,
        userId,
        lectureId,
        positionSeconds: dto.positionSeconds,
        completedAt,
      },
      update: { positionSeconds: dto.positionSeconds, completedAt },
    });

    if (completedAt) {
      // issueIfComplete is itself idempotent (checks for an existing certificate first), so
      // it's safe — and necessary — to re-check on every completed lecture, not just a fresh
      // not-complete -> complete transition: a prior attempt may have persisted completedAt
      // but failed before actually issuing the certificate (e.g. PDF rendering error), and a
      // "just transitioned" check would never retry that.
      await this.certificates.issueIfComplete(tenantId, userId, courseId);
    }
    return progress;
  }

  async getCourseProgress(tenantId: string, userId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, tenantId },
      select: { id: true },
    });
    if (!course) throw new NotFoundException('Course not found.');

    const [totalLectures, completedProgress] = await Promise.all([
      this.prisma.lecture.count({ where: { section: { courseId } } }),
      this.prisma.lectureProgress.findMany({
        where: { userId, lecture: { section: { courseId } } },
        select: { lectureId: true, positionSeconds: true, completedAt: true },
      }),
    ]);
    const completedCount = completedProgress.filter(
      (p) => p.completedAt !== null,
    ).length;
    return {
      totalLectures,
      completedCount,
      percent:
        totalLectures === 0
          ? 0
          : Math.round((completedCount / totalLectures) * 100),
      lectures: completedProgress,
    };
  }
}
