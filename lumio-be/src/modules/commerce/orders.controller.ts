import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { getTenantId } from '../../common/tenant-context';
import { OrdersService } from './orders.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('commerce')
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  listMine(@CurrentUser() user: CurrentUserPayload) {
    return this.orders.listMine(getTenantId(), user.userId);
  }

  @Get(':id')
  getMine(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.orders.getMine(getTenantId(), user.userId, id);
  }
}
