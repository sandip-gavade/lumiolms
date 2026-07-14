import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestRefundDto } from './dto/request-refund.dto';
import { StripeService } from './stripe.service';

const REFUND_WINDOW_DAYS = 30;

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  async request(
    tenantId: string,
    userId: string,
    orderId: string,
    dto: RequestRefundDto,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId, userId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found.');
    if (order.status !== 'PAID' && order.status !== 'PARTIALLY_REFUNDED') {
      throw new BadRequestException(
        `Order is ${order.status.toLowerCase()} and cannot be refunded.`,
      );
    }

    const windowEnd = new Date(
      order.createdAt.getTime() + REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );
    if (new Date() > windowEnd) {
      throw new BadRequestException(
        `The ${REFUND_WINDOW_DAYS}-day refund window for this order has passed.`,
      );
    }

    let orderItemId: string | null = null;
    let amountCents = order.totalCents;
    if (dto.orderItemId) {
      const item = order.items.find((i) => i.id === dto.orderItemId);
      if (!item)
        throw new NotFoundException('That course was not part of this order.');
      orderItemId = item.id;
      // Refund what was actually collected for this item, not its list price — same
      // proportional-discount logic as instructor payouts in CheckoutService.fulfillOrder.
      const collectedRatio =
        order.subtotalCents > 0 ? order.totalCents / order.subtotalCents : 1;
      amountCents = Math.round(item.priceCents * collectedRatio);
    }

    const existing = await this.prisma.refund.findFirst({
      where: {
        orderId: order.id,
        orderItemId,
        status: { in: ['REQUESTED', 'APPROVED'] },
      },
    });
    if (existing)
      throw new ConflictException(
        'A refund request for this order is already pending.',
      );

    return this.prisma.refund.create({
      data: {
        orderId: order.id,
        orderItemId,
        amountCents,
        reason: dto.reason,
        requestedByUserId: userId,
      },
    });
  }

  listForTenant(tenantId: string) {
    return this.prisma.refund.findMany({
      where: { order: { tenantId } },
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: { id: true, userId: true, stripePaymentIntentId: true },
        },
      },
    });
  }

  async process(
    tenantId: string,
    refundId: string,
    actorId: string,
    approve: boolean,
  ) {
    const refund = await this.prisma.refund.findFirst({
      where: { id: refundId, order: { tenantId } },
      include: { order: true },
    });
    if (!refund) throw new NotFoundException('Refund request not found.');
    if (refund.status !== 'REQUESTED') {
      throw new ConflictException(
        `Refund is already ${refund.status.toLowerCase()}.`,
      );
    }

    if (!approve) {
      return this.prisma.refund.update({
        where: { id: refund.id },
        data: {
          status: 'REJECTED',
          processedByUserId: actorId,
          processedAt: new Date(),
        },
      });
    }

    if (!refund.order.stripePaymentIntentId) {
      throw new ForbiddenException(
        'Order has no payment reference to refund against.',
      );
    }
    await this.stripe.refund(
      refund.order.stripePaymentIntentId,
      refund.amountCents,
    );

    const isFullOrderRefund = refund.orderItemId === null;
    const affectedItems = isFullOrderRefund
      ? await this.prisma.orderItem.findMany({
          where: { orderId: refund.orderId },
          select: { id: true, courseId: true },
        })
      : [
          await this.prisma.orderItem.findUniqueOrThrow({
            where: { id: refund.orderItemId! },
            select: { id: true, courseId: true },
          }),
        ];
    const affectedOrderItemIds = affectedItems.map((i) => i.id);
    const affectedCourseIds = affectedItems.map((i) => i.courseId);

    const newOrderStatus = isFullOrderRefund
      ? 'REFUNDED'
      : 'PARTIALLY_REFUNDED';

    const stillPendingPayouts =
      await this.prisma.instructorPayoutLedgerEntry.findMany({
        where: { orderItemId: { in: affectedOrderItemIds }, status: 'PENDING' },
        select: { id: true },
      });
    const alreadyPaidCount =
      affectedOrderItemIds.length - stillPendingPayouts.length;
    if (alreadyPaidCount > 0) {
      this.logger.warn(
        `Refund ${refund.id} covers ${alreadyPaidCount} order item(s) whose instructor payout was already marked PAID — clawback needs manual finance handling, not automated here.`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.refund.update({
        where: { id: refund.id },
        data: {
          status: 'PROCESSED',
          processedByUserId: actorId,
          processedAt: new Date(),
        },
      }),
      this.prisma.order.update({
        where: { id: refund.orderId },
        data: { status: newOrderStatus },
      }),
      this.prisma.enrollment.deleteMany({
        where: {
          userId: refund.order.userId,
          courseId: { in: affectedCourseIds },
        },
      }),
      // A payout not yet disbursed is simply voided; one already marked PAID is logged above
      // instead — out of scope for v1 to auto-claw-back a completed payout.
      this.prisma.instructorPayoutLedgerEntry.deleteMany({
        where: { id: { in: stillPendingPayouts.map((p) => p.id) } },
      }),
    ]);

    return this.prisma.refund.findUniqueOrThrow({ where: { id: refund.id } });
  }
}
