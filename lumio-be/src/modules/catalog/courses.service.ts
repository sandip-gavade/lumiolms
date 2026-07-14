import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Course, CourseStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { ListCoursesQueryDto } from './dto/list-courses.query.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { slugify } from './slug.util';

export interface Actor {
  userId: string | null;
  roles: string[];
  isSuperAdmin: boolean;
}

interface CourseListRow {
  id: string;
  title: string;
  slug: string;
  short_desc: string;
  level: string;
  price_cents: number;
  currency: string;
  thumbnail_url: string | null;
  status: string;
  category_id: string | null;
  category_name: string | null;
  instructor_id: string;
  instructor_name: string;
  rating_avg: number;
  rating_count: number;
}

/** Anonymous visitors and plain students only ever see PUBLISHED courses. An instructor also
 *  sees their own courses regardless of status. ORG_ADMIN/super-admin see everything in the
 *  tenant — used both for moderation and so an org admin can preview a submitted course
 *  before approving it. */
function visibilityFragment(actor: Actor): Prisma.Sql {
  if (actor.isSuperAdmin || actor.roles.includes('ORG_ADMIN')) {
    return Prisma.sql`TRUE`;
  }
  if (actor.userId && actor.roles.includes('INSTRUCTOR')) {
    return Prisma.sql`(c.status = 'PUBLISHED' OR c.instructor_id = ${actor.userId}::uuid)`;
  }
  return Prisma.sql`c.status = 'PUBLISHED'`;
}

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, actor: Actor, query: ListCoursesQueryDto) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const filters: Prisma.Sql[] = [
      Prisma.sql`c.tenant_id = ${tenantId}::uuid`,
      visibilityFragment(actor),
    ];
    if (query.categoryId)
      filters.push(Prisma.sql`c.category_id = ${query.categoryId}::uuid`);
    if (query.level)
      filters.push(Prisma.sql`c.level = ${query.level}::"CourseLevel"`);
    if (query.minPriceCents !== undefined)
      filters.push(Prisma.sql`c.price_cents >= ${query.minPriceCents}`);
    if (query.maxPriceCents !== undefined)
      filters.push(Prisma.sql`c.price_cents <= ${query.maxPriceCents}`);
    if (query.q) {
      filters.push(
        Prisma.sql`c.search_vector @@ websearch_to_tsquery('english', ${query.q})`,
      );
    }
    const where = Prisma.join(filters, ' AND ');

    const having =
      query.minRating !== undefined
        ? Prisma.sql`HAVING COALESCE(AVG(r.rating), 0) >= ${query.minRating}`
        : Prisma.empty;

    const orderBy = query.q
      ? Prisma.sql`ORDER BY ts_rank(c.search_vector, websearch_to_tsquery('english', ${query.q})) DESC`
      : Prisma.sql`ORDER BY c.created_at DESC`;

    const rows = await this.prisma.$queryRaw<CourseListRow[]>`
      SELECT
        c.id, c.title, c.slug, c.short_desc, c.level, c.price_cents, c.currency,
        c.thumbnail_url, c.status, c.category_id, cat.name AS category_name,
        c.instructor_id, u.name AS instructor_name,
        COALESCE(AVG(r.rating), 0)::float AS rating_avg,
        COUNT(DISTINCT r.id)::int AS rating_count
      FROM courses c
      LEFT JOIN reviews r ON r.course_id = c.id
      LEFT JOIN categories cat ON cat.id = c.category_id
      JOIN users u ON u.id = c.instructor_id
      WHERE ${where}
      GROUP BY c.id, cat.name, u.name
      ${having}
      ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [{ count }] = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM (
        SELECT c.id
        FROM courses c
        LEFT JOIN reviews r ON r.course_id = c.id
        WHERE ${where}
        GROUP BY c.id
        ${having}
      ) matched
    `;

    return {
      items: rows.map(this.mapListRow),
      total: Number(count),
      limit,
      offset,
    };
  }

  async getBySlug(tenantId: string, slug: string, actor: Actor) {
    const course = await this.prisma.course.findFirst({
      where: { tenantId, slug },
      include: {
        instructor: { select: { id: true, name: true, avatarUrl: true } },
        category: { select: { id: true, name: true, slug: true } },
        sections: {
          orderBy: { position: 'asc' },
          include: {
            lectures: {
              orderBy: { position: 'asc' },
              include: { resources: true },
            },
          },
        },
      },
    });
    if (!course || !this.isVisible(course, actor)) {
      throw new NotFoundException('Course not found.');
    }

    const enrolled = actor.userId
      ? Boolean(
          await this.prisma.enrollment.findUnique({
            where: {
              userId_courseId: { userId: actor.userId, courseId: course.id },
            },
          }),
        )
      : false;
    const canSeeFullContent =
      enrolled ||
      course.instructorId === actor.userId ||
      actor.isSuperAdmin ||
      actor.roles.includes('ORG_ADMIN');

    const ratingAgg = await this.prisma.review.aggregate({
      where: { courseId: course.id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      ...course,
      ratingAvg: ratingAgg._avg.rating ?? 0,
      ratingCount: ratingAgg._count.rating,
      sections: course.sections.map((section) => ({
        ...section,
        lectures: section.lectures.map((lecture) => ({
          ...lecture,
          // Gate the actual watchable content behind preview/ownership/enrollment — the
          // curriculum outline itself (titles, durations) stays visible to everyone so a
          // shopper can see what they'd be buying. See docs/requirements.md FR-2.3.
          videoAssetId:
            lecture.isPreview || canSeeFullContent
              ? lecture.videoAssetId
              : null,
          transcriptUrl:
            lecture.isPreview || canSeeFullContent
              ? lecture.transcriptUrl
              : null,
          resources:
            lecture.isPreview || canSeeFullContent ? lecture.resources : [],
        })),
      })),
    };
  }

  async create(tenantId: string, instructorId: string, dto: CreateCourseDto) {
    const slug = await this.uniqueSlug(tenantId, dto.title);
    return this.prisma.course.create({
      data: {
        tenantId,
        instructorId,
        categoryId: dto.categoryId,
        title: dto.title,
        slug,
        shortDesc: dto.shortDesc,
        longDesc: dto.longDesc,
        outcomes: dto.outcomes ?? [],
        level: dto.level,
        priceCents: dto.priceCents,
      },
    });
  }

  async update(
    tenantId: string,
    courseId: string,
    actor: Actor,
    dto: UpdateCourseDto,
  ) {
    const course = await this.requireOwned(tenantId, courseId, actor);
    if (course.status === 'ARCHIVED') {
      throw new ConflictException('An archived course cannot be edited.');
    }
    return this.prisma.course.update({
      where: { id: course.id },
      data: {
        categoryId: dto.categoryId,
        title: dto.title,
        shortDesc: dto.shortDesc,
        longDesc: dto.longDesc,
        outcomes: dto.outcomes,
        level: dto.level,
        priceCents: dto.priceCents,
      },
    });
  }

  /** DRAFT -> SUBMITTED. Only the owning instructor; org-admin review happens in publish(). */
  async submit(tenantId: string, courseId: string, actor: Actor) {
    const course = await this.requireOwned(tenantId, courseId, actor);
    return this.transition(course, 'DRAFT', 'SUBMITTED');
  }

  /** SUBMITTED -> PUBLISHED. Org-admin-only review gate — see FR-5.3. */
  async publish(tenantId: string, courseId: string, actor: Actor) {
    if (!actor.isSuperAdmin && !actor.roles.includes('ORG_ADMIN')) {
      throw new ForbiddenException(
        'Only an organization admin can publish a course.',
      );
    }
    const course = await this.findInTenantOrThrow(tenantId, courseId);
    const updated = await this.transition(course, 'SUBMITTED', 'PUBLISHED');
    return this.prisma.course.update({
      where: { id: updated.id },
      data: { publishedAt: new Date() },
    });
  }

  async archive(tenantId: string, courseId: string, actor: Actor) {
    const course = await this.requireOwned(tenantId, courseId, actor);
    if (course.status === 'ARCHIVED') return course;
    return this.prisma.course.update({
      where: { id: course.id },
      data: { status: 'ARCHIVED' },
    });
  }

  // ─────────────────────────────────────────────────────────────────────

  async requireOwned(
    tenantId: string,
    courseId: string,
    actor: Actor,
  ): Promise<Course> {
    const course = await this.findInTenantOrThrow(tenantId, courseId);
    const owns = course.instructorId === actor.userId;
    const privileged = actor.isSuperAdmin || actor.roles.includes('ORG_ADMIN');
    if (!owns && !privileged) {
      throw new ForbiddenException('You do not have access to this course.');
    }
    return course;
  }

  private async findInTenantOrThrow(
    tenantId: string,
    courseId: string,
  ): Promise<Course> {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, tenantId },
    });
    if (!course) throw new NotFoundException('Course not found.');
    return course;
  }

  private async transition(
    course: Course,
    from: CourseStatus,
    to: CourseStatus,
  ): Promise<Course> {
    if (course.status !== from) {
      throw new ConflictException(
        `Course must be ${from} to move to ${to} (currently ${course.status}).`,
      );
    }
    return this.prisma.course.update({
      where: { id: course.id },
      data: { status: to },
    });
  }

  private isVisible(course: Course, actor: Actor): boolean {
    if (course.status === 'PUBLISHED') return true;
    if (actor.isSuperAdmin || actor.roles.includes('ORG_ADMIN')) return true;
    return course.instructorId === actor.userId;
  }

  private async uniqueSlug(tenantId: string, title: string): Promise<string> {
    const base = slugify(title) || 'course';
    let candidate = base;
    let suffix = 2;
    while (
      await this.prisma.course.findFirst({
        where: { tenantId, slug: candidate },
        select: { id: true },
      })
    ) {
      candidate = `${base}-${suffix++}`;
    }
    return candidate;
  }

  private mapListRow(row: CourseListRow) {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      shortDesc: row.short_desc,
      level: row.level,
      priceCents: row.price_cents,
      currency: row.currency,
      thumbnailUrl: row.thumbnail_url,
      status: row.status,
      category: row.category_id
        ? { id: row.category_id, name: row.category_name }
        : null,
      instructor: { id: row.instructor_id, name: row.instructor_name },
      ratingAvg: row.rating_avg,
      ratingCount: row.rating_count,
    };
  }
}
