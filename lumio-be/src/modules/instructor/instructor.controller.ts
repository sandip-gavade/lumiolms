import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { getTenantId } from '../../common/tenant-context';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { InstructorService } from './instructor.service';

@ApiTags('instructor')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('INSTRUCTOR')
export class InstructorController {
  constructor(
    private readonly instructor: InstructorService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('instructor/dashboard')
  dashboard(@CurrentUser() user: CurrentUserPayload) {
    return this.instructor.dashboard(getTenantId(), user.userId);
  }

  @Get('instructor/courses/:id/analytics')
  analytics(
    @Param('id') courseId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.instructor.courseAnalytics(
      getTenantId(),
      user.userId,
      courseId,
    );
  }

  @Get('instructor/questions')
  inbox(@CurrentUser() user: CurrentUserPayload) {
    return this.instructor.questionsInbox(getTenantId(), user.userId);
  }

  @Post('courses/:id/announcements')
  @HttpCode(HttpStatus.CREATED)
  createAnnouncement(
    @Param('id') courseId: string,
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.instructor.createAnnouncement(
      getTenantId(),
      user.userId,
      courseId,
      dto,
    );
  }

  @Get('courses/:id/announcements')
  @Roles() // any authenticated tenant member may view; ownership isn't the read gate here
  listAnnouncements(@Param('id') courseId: string) {
    return this.prisma.announcement.findMany({
      where: { courseId, tenantId: getTenantId() },
      orderBy: { createdAt: 'desc' },
    });
  }
}
