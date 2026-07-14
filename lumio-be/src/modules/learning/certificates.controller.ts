import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { getTenantId } from '../../common/tenant-context';
import { CertificatesService } from './certificates.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('learning')
@Controller('certificates')
@UseGuards(JwtAuthGuard)
export class CertificatesController {
  constructor(private readonly certificates: CertificatesService) {}

  @Get('mine')
  listMine(@CurrentUser() user: CurrentUserPayload) {
    return this.certificates.listMine(getTenantId(), user.userId);
  }

  @Get(':id')
  getMine(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.certificates.getMine(getTenantId(), user.userId, id);
  }
}
