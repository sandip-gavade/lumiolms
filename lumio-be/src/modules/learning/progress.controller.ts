import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { getTenantId } from '../../common/tenant-context';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { ProgressService } from './progress.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('learning')
@Controller()
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Post('lectures/:id/progress')
  update(
    @Param('id') lectureId: string,
    @Body() dto: UpdateProgressDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.progress.updateLectureProgress(
      getTenantId(),
      user.userId,
      lectureId,
      dto,
    );
  }

  @Get('courses/:id/progress')
  get(@Param('id') courseId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.progress.getCourseProgress(
      getTenantId(),
      user.userId,
      courseId,
    );
  }
}
