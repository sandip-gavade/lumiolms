import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailQueueService } from '../notifications/email-queue.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { CreateQuestionDto } from './dto/create-question.dto';

export interface Actor {
  userId: string;
  roles: string[];
  isSuperAdmin: boolean;
}

@Injectable()
export class QaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueue: EmailQueueService,
    private readonly notifications: NotificationsService,
  ) {}

  async listForCourse(tenantId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, tenantId },
      select: { id: true },
    });
    if (!course) throw new NotFoundException('Course not found.');

    return this.prisma.question.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        answers: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  async ask(
    tenantId: string,
    courseId: string,
    actor: Actor,
    dto: CreateQuestionDto,
  ) {
    await this.requireCourseAccess(tenantId, courseId, actor);
    if (dto.lectureId) {
      const lecture = await this.prisma.lecture.findFirst({
        where: { id: dto.lectureId, section: { courseId } },
      });
      if (!lecture)
        throw new NotFoundException('That lecture is not part of this course.');
    }
    return this.prisma.question.create({
      data: {
        tenantId,
        courseId,
        lectureId: dto.lectureId,
        userId: actor.userId,
        body: dto.body,
      },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }

  async answer(
    tenantId: string,
    questionId: string,
    actor: Actor,
    dto: CreateAnswerDto,
  ) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        course: {
          select: {
            id: true,
            tenantId: true,
            title: true,
            slug: true,
            instructorId: true,
          },
        },
      },
    });
    if (!question || question.course.tenantId !== tenantId)
      throw new NotFoundException('Question not found.');
    await this.requireCourseAccess(tenantId, question.courseId, actor);

    const isInstructorAnswer = actor.userId === question.course.instructorId;
    const answer = await this.prisma.answer.create({
      data: {
        questionId,
        userId: actor.userId,
        body: dto.body,
        isInstructorAnswer,
      },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });

    if (question.userId !== actor.userId) {
      await this.notifyAsker(tenantId, question, dto.body);
    }
    return answer;
  }

  private async notifyAsker(
    tenantId: string,
    question: {
      userId: string;
      courseId: string;
      course: { title: string; slug: string };
    },
    replyBody: string,
  ) {
    const asker = await this.prisma.user.findUnique({
      where: { id: question.userId },
    });
    if (!asker) return;

    await this.notifications.create(tenantId, question.userId, 'QA_REPLY', {
      courseId: question.courseId,
      excerpt: replyBody.slice(0, 140),
    });
    await this.emailQueue.enqueue({
      type: 'qa-reply',
      to: asker.email,
      name: asker.name,
      questionExcerpt: replyBody.slice(0, 140),
      courseTitle: question.course.title,
      courseUrl: `/courses/${question.course.slug}`,
    });
  }

  /** Enrolled students, the course's own instructor, or org-admin/super-admin — matches
   *  FR-4.5 ("students post questions... instructors or other students reply"). */
  private async requireCourseAccess(
    tenantId: string,
    courseId: string,
    actor: Actor,
  ) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, tenantId },
    });
    if (!course) throw new NotFoundException('Course not found.');

    if (
      actor.isSuperAdmin ||
      actor.roles.includes('ORG_ADMIN') ||
      course.instructorId === actor.userId
    ) {
      return course;
    }
    const enrolled = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: actor.userId, courseId } },
    });
    if (!enrolled)
      throw new ForbiddenException(
        'You must be enrolled in this course to participate in Q&A.',
      );
    return course;
  }
}
