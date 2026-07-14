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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { ImpersonateDto } from './dto/impersonate.dto';
import { SuperAdminService } from './super-admin.service';

@ApiTags('super-admin')
@Controller('super-admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class SuperAdminController {
  constructor(private readonly superAdmin: SuperAdminService) {}

  @Get('tenants')
  listTenants() {
    return this.superAdmin.listTenants();
  }

  @Post('tenants/:id/suspend')
  @HttpCode(HttpStatus.OK)
  suspend(
    @Param('id') tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.superAdmin.setTenantStatus(user.userId, tenantId, false);
  }

  @Post('tenants/:id/activate')
  @HttpCode(HttpStatus.OK)
  activate(
    @Param('id') tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.superAdmin.setTenantStatus(user.userId, tenantId, true);
  }

  @Get('analytics')
  analytics() {
    return this.superAdmin.platformAnalytics();
  }

  @Post('impersonate/:userId')
  @HttpCode(HttpStatus.OK)
  impersonate(
    @Param('userId') userId: string,
    @Body() dto: ImpersonateDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.superAdmin.impersonate(user.userId, userId, dto.tenantId);
  }
}
