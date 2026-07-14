import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Shared by every learning-module service that needs to know "is this user actually taking
 * this course" before letting them touch progress/notes/Q&A.
 *
 * Takes `tenantId` deliberately, not just `userId`/`courseId`: a user can hold Memberships
 * (and therefore Enrollments) in more than one tenant, so an Enrollment row existing for this
 * user+course is not by itself proof they're allowed to touch it under the *current* session
 * — that enrollment might belong to a different tenant they're also a member of. Filtering by
 * tenantId here (not just checking course.tenantId separately) is what stops a session
 * authenticated into tenant B from writing progress/notes rows mislabeled with tenant B while
 * actually acting on a tenant A course.
 */
@Injectable()
export class EnrollmentGuard {
  constructor(private readonly prisma: PrismaService) {}

  async requireEnrollment(
    tenantId: string,
    userId: string,
    courseId: string,
  ): Promise<void> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { tenantId, userId, courseId },
    });
    if (!enrollment) {
      throw new ForbiddenException(
        'You must be enrolled in this course to do that.',
      );
    }
  }
}
