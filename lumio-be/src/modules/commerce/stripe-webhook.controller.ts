import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import Stripe from 'stripe';
import { CheckoutService } from './checkout.service';
import { StripeService } from './stripe.service';
import { ApiTags } from '@nestjs/swagger';

/**
 * Real Stripe checkout flow (STRIPE_SECRET_KEY configured) lands here once the customer
 * pays: `checkout.session.completed` carries the same orderId we stored as
 * `stripePaymentIntentId` at checkout time, which is what fulfillOrder() looks up by. In dev
 * mode (no Stripe configured) this endpoint is unreachable/unused — CheckoutService fulfills
 * synchronously instead. Not covered by the tenant-scoping extension or JwtAuthGuard: Stripe
 * calls this directly, with no tenant/user session — the signature check is the only guard.
 */
@ApiTags('commerce')
@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripe: StripeService,
    private readonly checkout: CheckoutService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody || !signature) {
      throw new BadRequestException(
        'Missing Stripe signature or request body.',
      );
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.constructWebhookEvent(req.rawBody, signature);
    } catch (err) {
      this.logger.warn(
        `Stripe webhook signature verification failed: ${(err as Error).message}`,
      );
      throw new BadRequestException('Invalid Stripe webhook signature.');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id;
      await this.checkout.fulfillOrder(session.id, paymentIntentId);
    }

    return { received: true };
  }
}
