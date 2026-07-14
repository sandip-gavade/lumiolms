import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { getRequestContext, getTenantId } from '../../common/tenant-context';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Actor } from './courses.service';
import { CurriculumService } from './curriculum.service';
import { CreateLectureDto } from './dto/create-lecture.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('catalog')
@Controller()
@UseGuards(JwtAuthGuard)
export class SectionsController {
  constructor(private readonly curriculum: CurriculumService) {}

  private actor(): Actor {
    const { userId, roles, isSuperAdmin } = getRequestContext();
    return { userId, roles, isSuperAdmin };
  }

  @Post('courses/:courseId/sections')
  @HttpCode(HttpStatus.CREATED)
  addSection(
    @Param('courseId') courseId: string,
    @Body() dto: CreateSectionDto,
  ) {
    return this.curriculum.addSection(
      getTenantId(),
      courseId,
      this.actor(),
      dto,
    );
  }

  @Patch('sections/:id')
  update(@Param('id') id: string, @Body() dto: UpdateSectionDto) {
    return this.curriculum.updateSection(getTenantId(), id, this.actor(), dto);
  }

  @Delete('sections/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.curriculum.removeSection(getTenantId(), id, this.actor());
  }

  @Post('sections/:id/lectures')
  @HttpCode(HttpStatus.CREATED)
  addLecture(@Param('id') id: string, @Body() dto: CreateLectureDto) {
    return this.curriculum.addLecture(getTenantId(), id, this.actor(), dto);
  }
}
