import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { getRequestContext, getTenantId } from '../../common/tenant-context';
import { Actor, CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { ListCoursesQueryDto } from './dto/list-courses.query.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('catalog')
@Controller('courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  private actor(): Actor {
    const { userId, roles, isSuperAdmin } = getRequestContext();
    return { userId, roles, isSuperAdmin };
  }

  @Get()
  list(@Query() query: ListCoursesQueryDto) {
    return this.courses.list(getTenantId(), this.actor(), query);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.courses.getBySlug(getTenantId(), slug, this.actor());
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INSTRUCTOR')
  create(
    @Body() dto: CreateCourseDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.courses.create(getTenantId(), user.userId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.courses.update(getTenantId(), id, this.actor(), dto);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  submit(@Param('id') id: string) {
    return this.courses.submit(getTenantId(), id, this.actor());
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_ADMIN')
  publish(@Param('id') id: string) {
    return this.courses.publish(getTenantId(), id, this.actor());
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  archive(@Param('id') id: string) {
    return this.courses.archive(getTenantId(), id, this.actor());
  }
}
