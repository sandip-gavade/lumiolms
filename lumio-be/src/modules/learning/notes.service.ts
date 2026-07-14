import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { EnrollmentGuard } from './enrollment.util';

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollmentGuard: EnrollmentGuard,
  ) {}

  async listForLecture(tenantId: string, userId: string, lectureId: string) {
    // Scoped by tenantId too, not just userId: a multi-tenant account's session in tenant B
    // must not surface their own notes from a tenant A course (see EnrollmentGuard's
    // reasoning — same multi-membership isolation concern).
    return this.prisma.note.findMany({
      where: { tenantId, userId, lectureId },
      orderBy: { timestampSeconds: 'asc' },
    });
  }

  async create(
    tenantId: string,
    userId: string,
    lectureId: string,
    dto: CreateNoteDto,
  ) {
    const lecture = await this.prisma.lecture.findUnique({
      where: { id: lectureId },
      include: { section: { select: { courseId: true } } },
    });
    if (!lecture) throw new NotFoundException('Lecture not found.');
    await this.enrollmentGuard.requireEnrollment(
      tenantId,
      userId,
      lecture.section.courseId,
    );

    return this.prisma.note.create({
      data: {
        tenantId,
        userId,
        lectureId,
        timestampSeconds: dto.timestampSeconds,
        body: dto.body,
      },
    });
  }

  async update(
    tenantId: string,
    userId: string,
    noteId: string,
    dto: UpdateNoteDto,
  ) {
    await this.requireOwnNote(tenantId, userId, noteId);
    return this.prisma.note.update({
      where: { id: noteId },
      data: { body: dto.body },
    });
  }

  async remove(tenantId: string, userId: string, noteId: string) {
    await this.requireOwnNote(tenantId, userId, noteId);
    await this.prisma.note.delete({ where: { id: noteId } });
  }

  private async requireOwnNote(
    tenantId: string,
    userId: string,
    noteId: string,
  ) {
    const note = await this.prisma.note.findUnique({ where: { id: noteId } });
    if (!note || note.tenantId !== tenantId)
      throw new NotFoundException('Note not found.');
    if (note.userId !== userId)
      throw new ForbiddenException('This is not your note.');
    return note;
  }
}
