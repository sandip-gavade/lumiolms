import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async view(tenantId: string, userId: string) {
    const cart = await this.findOrCreateCart(tenantId, userId);
    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            priceCents: true,
            currency: true,
            thumbnailUrl: true,
            status: true,
          },
        },
      },
      orderBy: { addedAt: 'asc' },
    });
    const subtotalCents = items.reduce(
      (sum, item) => sum + item.course.priceCents,
      0,
    );
    return { items, subtotalCents };
  }

  async addItem(tenantId: string, userId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, tenantId, status: 'PUBLISHED' },
    });
    if (!course) throw new NotFoundException('Course not found.');

    const alreadyEnrolled = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (alreadyEnrolled)
      throw new ConflictException('You are already enrolled in this course.');

    const cart = await this.findOrCreateCart(tenantId, userId);
    try {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, courseId },
      });
    } catch (err: any) {
      if (err?.code === 'P2002')
        throw new ConflictException('This course is already in your cart.');
      throw err;
    }
    return this.view(tenantId, userId);
  }

  async removeItem(tenantId: string, userId: string, courseId: string) {
    const cart = await this.findOrCreateCart(tenantId, userId);
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id, courseId },
    });
    return this.view(tenantId, userId);
  }

  async findOrCreateCart(tenantId: string, userId: string) {
    return this.prisma.cart.upsert({
      where: { tenantId_userId: { tenantId, userId } },
      update: {},
      create: { tenantId, userId },
    });
  }
}
