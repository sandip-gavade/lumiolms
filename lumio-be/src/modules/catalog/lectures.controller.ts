import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { getRequestContext, getTenantId } from '../../common/tenant-context';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Actor } from './courses.service';
import { CurriculumService } from './curriculum.service';
import { UpdateLectureDto } from './dto/update-lecture.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('catalog')
@Controller('lectures')
@UseGuards(JwtAuthGuard)
export class LecturesController {
  constructor(private readonly curriculum: CurriculumService) {}

  private actor(): Actor {
    const { userId, roles, isSuperAdmin } = getRequestContext();
    return { userId, roles, isSuperAdmin };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLectureDto) {
    return this.curriculum.updateLecture(getTenantId(), id, this.actor(), dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.curriculum.removeLecture(getTenantId(), id, this.actor());
  }
}
