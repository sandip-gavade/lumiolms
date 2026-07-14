import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export interface CheckoutLineItem {
  courseId: string;
  title: string;
  unitAmountCents: number;
}

export interface CreateCheckoutSessionParams {
  orderId: string;
  currency: string;
  items: CheckoutLineItem[];
  discountCents: number;
}

export interface CheckoutSessionResult {
  /** Whatever reference Stripe (or the dev fallback) gave us for this attempt — stored in
   *  Order.stripePaymentIntentId until the webhook swaps it for the real PaymentIntent id. */
  reference: string;
  url: string | null;
  /** True when there's no real Stripe integration to wait on, so the caller should fulfill
   *  the order immediately instead of waiting for a webhook. */
  devMode: boolean;
}

/**
 * Thin wrapper around the Stripe SDK with a dev-mode fallback, same shape as
 * EmailProcessor's logging stub: with no STRIPE_SECRET_KEY configured, checkout sessions are
 * fabricated locally and the caller fulfills the order synchronously instead of waiting on a
 * webhook. This is what makes the whole commerce flow (order -> enrollment -> payout ledger)
 * testable end-to-end without live Stripe credentials — see CheckoutService.
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly client: Stripe | null;
  private readonly webhookSecret: string | null;

  constructor(private readonly config: ConfigService) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    this.client = secretKey ? new Stripe(secretKey) : null;
    this.webhookSecret =
      this.config.get<string>('STRIPE_WEBHOOK_SECRET') || null;
    if (!this.client) {
      this.logger.warn(
        'STRIPE_SECRET_KEY not set — running in dev mode: checkouts fulfill immediately, no real payment.',
      );
    }
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  async createCheckoutSession(
    params: CreateCheckoutSessionParams,
  ): Promise<CheckoutSessionResult> {
    if (!this.client) {
      return { reference: `cs_dev_${randomUUID()}`, url: null, devMode: true };
    }

    const session = await this.client.checkout.sessions.create({
      mode: 'payment',
      line_items: params.items.map((item) => ({
        quantity: 1,
        price_data: {
          currency: params.currency,
          unit_amount: item.unitAmountCents,
          product_data: { name: item.title },
        },
      })),
      // Stripe Checkout applies discounts as coupons on its own side; we've already computed
      // discountCents against our own Coupon model, so we pass it through as a fixed-amount
      // one-off discount rather than re-modeling the coupon in Stripe.
      discounts:
        params.discountCents > 0
          ? [
              {
                coupon: await this.ensureOneOffDiscountCoupon(
                  params.discountCents,
                  params.currency,
                ),
              },
            ]
          : undefined,
      metadata: { orderId: params.orderId },
      success_url: `${this.config.get<string>('APP_URL')}/orders/${params.orderId}?checkout=success`,
      cancel_url: `${this.config.get<string>('APP_URL')}/cart?checkout=cancelled`,
    });

    return { reference: session.id, url: session.url, devMode: false };
  }

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    if (!this.client || !this.webhookSecret) {
      throw new Error('Stripe webhooks are not configured on this server.');
    }
    return this.client.webhooks.constructEvent(
      rawBody,
      signature,
      this.webhookSecret,
    );
  }

  async refund(paymentIntentId: string, amountCents: number): Promise<void> {
    if (!this.client) {
      this.logger.log(
        `[dev-mode] would refund ${amountCents} cents against ${paymentIntentId}`,
      );
      return;
    }
    await this.client.refunds.create({
      payment_intent: paymentIntentId,
      amount: amountCents,
    });
  }

  private async ensureOneOffDiscountCoupon(
    amountCents: number,
    currency: string,
  ): Promise<string> {
    // A fresh Stripe coupon per checkout — simplest way to apply an arbitrary fixed
    // discount without maintaining a synced mirror of our Coupon model inside Stripe.
    const coupon = await this.client!.coupons.create({
      amount_off: amountCents,
      currency,
      duration: 'once',
    });
    return coupon.id;
  }
}
