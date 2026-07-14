import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Coupon } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.coupon.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, dto: CreateCouponDto): Promise<Coupon> {
    try {
      return await this.prisma.coupon.create({
        data: {
          tenantId,
          code: dto.code.toUpperCase(),
          discountType: dto.discountType,
          discountValue: dto.discountValue,
          startsAt: dto.startsAt,
          endsAt: dto.endsAt,
          maxRedemptions: dto.maxRedemptions,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002')
        throw new ConflictException('A coupon with this code already exists.');
      throw err;
    }
  }

  /** Validates and returns a redeemable coupon, or throws — used at checkout, not exposed
   *  as a standalone "preview" endpoint in v1. */
  async requireRedeemable(tenantId: string, code: string): Promise<Coupon> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { tenantId_code: { tenantId, code: code.toUpperCase() } },
    });
    const now = new Date();
    if (!coupon || coupon.startsAt > now || coupon.endsAt < now) {
      throw new NotFoundException(
        'This coupon code is invalid or has expired.',
      );
    }
    if (
      coupon.maxRedemptions !== null &&
      coupon.redeemedCount >= coupon.maxRedemptions
    ) {
      throw new ConflictException(
        'This coupon has reached its redemption limit.',
      );
    }
    return coupon;
  }

  computeDiscountCents(coupon: Coupon, subtotalCents: number): number {
    const raw =
      coupon.discountType === 'PERCENT'
        ? Math.round((subtotalCents * coupon.discountValue) / 100)
        : coupon.discountValue;
    return Math.min(raw, subtotalCents);
  }
}
