import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, courseId: string) {
    await this.requireCourseInTenant(tenantId, courseId);

    const [reviews, summary, histogram] = await Promise.all([
      this.prisma.review.findMany({
        where: { courseId },
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      }),
      this.prisma.review.aggregate({
        where: { courseId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where: { courseId },
        _count: { rating: true },
      }),
    ]);

    const byStars: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of histogram) byStars[row.rating] = row._count.rating;

    return {
      reviews,
      ratingAvg: summary._avg.rating ?? 0,
      ratingCount: summary._count.rating,
      histogram: byStars,
    };
  }

  /** One review per enrolled student, editable by its author — FR-2.4. Upsert rather than a
   *  separate create/update endpoint since "review this course" is a single user action
   *  regardless of whether they've reviewed it before. */
  async upsert(
    tenantId: string,
    courseId: string,
    userId: string,
    dto: CreateReviewDto,
  ) {
    await this.requireCourseInTenant(tenantId, courseId);

    const enrolled = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrolled) {
      throw new ForbiddenException(
        'Only enrolled students can review this course.',
      );
    }

    return this.prisma.review.upsert({
      where: { courseId_userId: { courseId, userId } },
      create: {
        tenantId,
        courseId,
        userId,
        rating: dto.rating,
        title: dto.title,
        body: dto.body,
      },
      update: { rating: dto.rating, title: dto.title, body: dto.body },
    });
  }

  private async requireCourseInTenant(
    tenantId: string,
    courseId: string,
  ): Promise<void> {
    const exists = await this.prisma.course.findFirst({
      where: { id: courseId, tenantId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Course not found.');
  }
}
