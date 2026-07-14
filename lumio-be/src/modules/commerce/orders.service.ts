import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  listMine(tenantId: string, userId: string) {
    return this.prisma.order.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            course: {
              select: { id: true, title: true, slug: true, thumbnailUrl: true },
            },
          },
        },
      },
    });
  }

  async getMine(tenantId: string, userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId, userId },
      include: {
        items: {
          include: {
            course: {
              select: { id: true, title: true, slug: true, thumbnailUrl: true },
            },
            refunds: true,
          },
        },
        coupon: {
          select: { code: true, discountType: true, discountValue: true },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found.');
    return order;
  }
}
