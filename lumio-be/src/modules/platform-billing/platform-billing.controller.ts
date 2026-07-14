import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { getTenantId } from '../../common/tenant-context';
import { CreatePlanDto } from './dto/create-plan.dto';
import { SubscribeDto } from './dto/subscribe.dto';
import { PlatformBillingService } from './platform-billing.service';

@ApiTags('platform-billing')
@Controller()
export class PlatformBillingController {
  constructor(private readonly billing: PlatformBillingService) {}

  @Get('billing/plans')
  listPlans() {
    return this.billing.listPlans();
  }

  @Post('super-admin/plans')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  createPlan(@Body() dto: CreatePlanDto) {
    return this.billing.createPlan(dto);
  }

  @Get('tenants/me/subscription')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_ADMIN')
  getMine() {
    return this.billing.getMine(getTenantId());
  }

  @Post('tenants/me/subscription')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_ADMIN')
  subscribe(@Body() dto: SubscribeDto) {
    return this.billing.subscribe(getTenantId(), dto);
  }
}
