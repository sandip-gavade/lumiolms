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
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { getTenantId } from '../../common/tenant-context';
import { RequestRefundDto } from './dto/request-refund.dto';
import { RefundsService } from './refunds.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('commerce')
@Controller()
@UseGuards(JwtAuthGuard)
export class RefundsController {
  constructor(private readonly refunds: RefundsService) {}

  @Post('orders/:orderId/refund')
  @HttpCode(HttpStatus.CREATED)
  request(
    @Param('orderId') orderId: string,
    @Body() dto: RequestRefundDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.refunds.request(getTenantId(), user.userId, orderId, dto);
  }

  @Get('refunds')
  @UseGuards(RolesGuard)
  @Roles('ORG_ADMIN')
  list() {
    return this.refunds.listForTenant(getTenantId());
  }

  @Post('refunds/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('ORG_ADMIN')
  approve(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.refunds.process(getTenantId(), id, user.userId, true);
  }

  @Post('refunds/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('ORG_ADMIN')
  reject(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.refunds.process(getTenantId(), id, user.userId, false);
  }
}
