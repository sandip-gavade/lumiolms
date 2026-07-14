import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { getTenantId } from '../../common/tenant-context';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantBrandingDto } from './dto/update-tenant-branding.dto';
import { TenancyService } from './tenancy.service';

@ApiTags('tenancy')
@Controller()
export class TenancyController {
  constructor(private readonly tenancy: TenancyService) {}

  @Post('tenants')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTenantDto) {
    return this.tenancy.createTenant(dto);
  }

  @Get('tenants/me')
  @UseGuards(JwtAuthGuard)
  getMine() {
    return this.tenancy.getMine(getTenantId());
  }

  @Patch('tenants/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_ADMIN')
  updateBranding(@Body() dto: UpdateTenantBrandingDto) {
    return this.tenancy.updateBranding(getTenantId(), dto);
  }
}
