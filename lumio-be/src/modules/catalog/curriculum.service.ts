import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Actor, CoursesService } from './courses.service';
import { CreateLectureDto } from './dto/create-lecture.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateLectureDto } from './dto/update-lecture.dto';
import { UpdateSectionDto } from './dto/update-section.dto';

/** Sections/lectures are owned by their course, not tenant-tagged directly — every mutation
 *  routes through CoursesService.requireOwned so the same instructor-or-admin rule applies
 *  everywhere (see PrismaService's TENANT_SCOPED_MODELS note on why these aren't in the
 *  tenant-scoping extension). */
@Injectable()
export class CurriculumService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courses: CoursesService,
  ) {}

  async addSection(
    tenantId: string,
    courseId: string,
    actor: Actor,
    dto: CreateSectionDto,
  ) {
    await this.courses.requireOwned(tenantId, courseId, actor);
    return this.prisma.courseSection.create({
      data: { courseId, title: dto.title, position: dto.position },
    });
  }

  async updateSection(
    tenantId: string,
    sectionId: string,
    actor: Actor,
    dto: UpdateSectionDto,
  ) {
    const section = await this.findSectionOrThrow(sectionId);
    await this.courses.requireOwned(tenantId, section.courseId, actor);
    return this.prisma.courseSection.update({
      where: { id: sectionId },
      data: dto,
    });
  }

  async removeSection(tenantId: string, sectionId: string, actor: Actor) {
    const section = await this.findSectionOrThrow(sectionId);
    await this.courses.requireOwned(tenantId, section.courseId, actor);
    await this.prisma.courseSection.delete({ where: { id: sectionId } });
  }

  async addLecture(
    tenantId: string,
    sectionId: string,
    actor: Actor,
    dto: CreateLectureDto,
  ) {
    const section = await this.findSectionOrThrow(sectionId);
    await this.courses.requireOwned(tenantId, section.courseId, actor);
    return this.prisma.lecture.create({
      data: {
        sectionId,
        title: dto.title,
        position: dto.position,
        durationSeconds: dto.durationSeconds,
        videoAssetId: dto.videoAssetId,
        transcriptUrl: dto.transcriptUrl,
        isPreview: dto.isPreview ?? false,
      },
    });
  }

  async updateLecture(
    tenantId: string,
    lectureId: string,
    actor: Actor,
    dto: UpdateLectureDto,
  ) {
    const lecture = await this.findLectureOrThrow(lectureId);
    await this.courses.requireOwned(tenantId, lecture.section.courseId, actor);
    return this.prisma.lecture.update({ where: { id: lectureId }, data: dto });
  }

  async removeLecture(tenantId: string, lectureId: string, actor: Actor) {
    const lecture = await this.findLectureOrThrow(lectureId);
    await this.courses.requireOwned(tenantId, lecture.section.courseId, actor);
    await this.prisma.lecture.delete({ where: { id: lectureId } });
  }

  private async findSectionOrThrow(sectionId: string) {
    const section = await this.prisma.courseSection.findUnique({
      where: { id: sectionId },
    });
    if (!section) throw new NotFoundException('Section not found.');
    return section;
  }

  private async findLectureOrThrow(lectureId: string) {
    const lecture = await this.prisma.lecture.findUnique({
      where: { id: lectureId },
      include: { section: { select: { courseId: true } } },
    });
    if (!lecture) throw new NotFoundException('Lecture not found.');
    return lecture;
  }
}
