import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { getTenantId } from '../../common/tenant-context';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('commerce')
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  view(@CurrentUser() user: CurrentUserPayload) {
    return this.cart.view(getTenantId(), user.userId);
  }

  @Post('items')
  addItem(
    @Body() dto: AddCartItemDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.cart.addItem(getTenantId(), user.userId, dto.courseId);
  }

  @Delete('items/:courseId')
  removeItem(
    @Param('courseId') courseId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.cart.removeItem(getTenantId(), user.userId, courseId);
  }
}
