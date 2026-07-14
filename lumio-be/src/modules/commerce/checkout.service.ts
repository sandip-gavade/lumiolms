import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from './cart.service';
import { CheckoutDto } from './dto/checkout.dto';
import { CouponsService } from './coupons.service';
import { StripeService } from './stripe.service';

export interface CheckoutResult {
  orderId: string;
  status: 'PENDING' | 'PAID';
  checkoutUrl: string | null;
}

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);
  private readonly platformSharePercent: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cart: CartService,
    private readonly coupons: CouponsService,
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
  ) {
    this.platformSharePercent = Number(
      this.config.get<string>('PLATFORM_REVENUE_SHARE_PERCENT') ?? '30',
    );
  }

  async checkout(
    tenantId: string,
    userId: string,
    dto: CheckoutDto,
  ): Promise<CheckoutResult> {
    const { items } = await this.cart.view(tenantId, userId);
    if (items.length === 0) {
      throw new BadRequestException('Your cart is empty.');
    }

    const subtotalCents = items.reduce(
      (sum, item) => sum + item.course.priceCents,
      0,
    );
    const coupon = dto.couponCode
      ? await this.coupons.requireRedeemable(tenantId, dto.couponCode)
      : null;
    const discountCents = coupon
      ? this.coupons.computeDiscountCents(coupon, subtotalCents)
      : 0;
    const totalCents = subtotalCents - discountCents;
    const currency = items[0].course.currency;

    const order = await this.prisma.order.create({
      data: {
        tenantId,
        userId,
        couponId: coupon?.id,
        subtotalCents,
        discountCents,
        totalCents,
        currency,
        items: {
          create: items.map((item) => ({
            courseId: item.course.id,
            priceCents: item.course.priceCents,
          })),
        },
      },
    });

    const session = await this.stripe.createCheckoutSession({
      orderId: order.id,
      currency,
      discountCents,
      items: items.map((item) => ({
        courseId: item.course.id,
        title: item.course.title,
        unitAmountCents: item.course.priceCents,
      })),
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: { stripePaymentIntentId: session.reference },
    });

    if (session.devMode) {
      this.logger.warn(
        `Dev-mode checkout: fulfilling order ${order.id} immediately (no real payment took place).`,
      );
      await this.fulfillOrder(session.reference);
      return { orderId: order.id, status: 'PAID', checkoutUrl: null };
    }

    return { orderId: order.id, status: 'PENDING', checkoutUrl: session.url };
  }

  /**
   * Idempotent by design (Stripe/any caller may retry a webhook): a second call for an
   * already-PAID order is a no-op. Looked up by `stripePaymentIntentId` because that's the
   * only identifier a Stripe webhook event carries back to us.
   */
  async fulfillOrder(
    paymentReference: string,
    finalPaymentIntentId?: string,
  ): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { stripePaymentIntentId: paymentReference },
      include: {
        items: { include: { course: { select: { instructorId: true } } } },
      },
    });
    if (!order) {
      throw new NotFoundException(
        `No order found for payment reference ${paymentReference}.`,
      );
    }
    if (order.status === 'PAID') {
      return; // already fulfilled — webhook retry
    }

    // Payouts are computed off what was actually collected, not the item's list price — a
    // coupon's cost is shared proportionally across items rather than being absorbed
    // entirely by the platform while instructors still get paid full price.
    const collectedRatio =
      order.subtotalCents > 0 ? order.totalCents / order.subtotalCents : 1;
    const instructorShareCents = (priceCents: number) => {
      const effectivePriceCents = Math.round(priceCents * collectedRatio);
      return Math.round(
        (effectivePriceCents * (100 - this.platformSharePercent)) / 100,
      );
    };

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          // Swap the checkout-session reference for the real PaymentIntent id, which is
          // what Stripe's refund API actually needs — see RefundsService.
          ...(finalPaymentIntentId
            ? { stripePaymentIntentId: finalPaymentIntentId }
            : {}),
        },
      }),
      ...order.items.map((item) =>
        this.prisma.enrollment.upsert({
          where: {
            userId_courseId: { userId: order.userId, courseId: item.courseId },
          },
          create: {
            tenantId: order.tenantId,
            userId: order.userId,
            courseId: item.courseId,
            orderItemId: item.id,
          },
          update: {},
        }),
      ),
      ...order.items.map((item) =>
        this.prisma.instructorPayoutLedgerEntry.create({
          data: {
            tenantId: order.tenantId,
            instructorId: item.course.instructorId,
            orderItemId: item.id,
            amountCents: instructorShareCents(item.priceCents),
          },
        }),
      ),
      ...(order.couponId
        ? [
            this.prisma.coupon.update({
              where: { id: order.couponId },
              data: { redeemedCount: { increment: 1 } },
            }),
          ]
        : []),
      // Only the items that were actually part of *this* order — cart contents added after
      // checkout started (real Stripe flow can take minutes before the webhook fires) must
      // survive.
      this.prisma.cartItem.deleteMany({
        where: {
          cart: { tenantId: order.tenantId, userId: order.userId },
          courseId: { in: order.items.map((item) => item.courseId) },
        },
      }),
    ]);
  }
}
