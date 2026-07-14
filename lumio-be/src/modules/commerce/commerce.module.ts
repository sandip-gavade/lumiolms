import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';
import { StripeWebhookController } from './stripe-webhook.controller';
import { StripeService } from './stripe.service';

@Module({
  controllers: [
    CartController,
    CheckoutController,
    StripeWebhookController,
    OrdersController,
    RefundsController,
    CouponsController,
  ],
  providers: [
    CartService,
    CheckoutService,
    StripeService,
    OrdersService,
    RefundsService,
    CouponsService,
  ],
  exports: [CartService],
})
export class CommerceModule {}
