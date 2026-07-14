import {
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
import { OrgAdminService } from './org-admin.service';

@ApiTags('org-admin')
@Controller('org-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ORG_ADMIN')
export class OrgAdminController {
  constructor(private readonly orgAdmin: OrgAdminService) {}

  @Get('users')
  listUsers() {
    return this.orgAdmin.listUsers(getTenantId());
  }

  @Post('users/:userId/suspend')
  @HttpCode(HttpStatus.NO_CONTENT)
  async suspend(
    @Param('userId') userId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.orgAdmin.setUserSuspension(
      getTenantId(),
      user.userId,
      userId,
      true,
    );
  }

  @Post('users/:userId/reinstate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reinstate(
    @Param('userId') userId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.orgAdmin.setUserSuspension(
      getTenantId(),
      user.userId,
      userId,
      false,
    );
  }

  @Get('analytics')
  analytics() {
    return this.orgAdmin.analytics(getTenantId());
  }
}
