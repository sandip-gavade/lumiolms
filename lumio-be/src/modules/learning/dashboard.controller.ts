import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { getTenantId } from '../../common/tenant-context';
import { DashboardService } from './dashboard.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('learning')
@Controller('my-learning')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  myLearning(@CurrentUser() user: CurrentUserPayload) {
    return this.dashboard.myLearning(getTenantId(), user.userId);
  }
}
