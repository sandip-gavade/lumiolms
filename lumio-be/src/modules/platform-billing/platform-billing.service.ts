import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { SubscribeDto } from './dto/subscribe.dto';

const SUBSCRIPTION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * TODO(stripe-billing): this records which plan a tenant has chosen and treats it as
 * immediately active — there's no real Stripe Subscriptions integration (recurring charges,
 * dunning on failed payment, proration on plan change). That's a substantial separate
 * feature; StripeService (commerce module) only covers one-off course-purchase checkout
 * today. Deferred rather than half-built against an untestable surface.
 */
@Injectable()
export class PlatformBillingService {
  constructor(private readonly prisma: PrismaService) {}

  listPlans() {
    return this.prisma.subscriptionPlan.findMany({
      orderBy: { priceCentsMo: 'asc' },
    });
  }

  async createPlan(dto: CreatePlanDto) {
    try {
      return await this.prisma.subscriptionPlan.create({
        data: {
          code: dto.code,
          name: dto.name,
          priceCentsMo: dto.priceCentsMo,
          seatLimit: dto.seatLimit,
          features: (dto.features ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002')
        throw new ConflictException(
          `A plan with code ${dto.code} already exists.`,
        );
      throw err;
    }
  }

  async getMine(tenantId: string) {
    return this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });
  }

  async subscribe(tenantId: string, dto: SubscribeDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { code: dto.planCode },
    });
    if (!plan)
      throw new NotFoundException(`No plan with code ${dto.planCode}.`);
    if (plan.seatLimit !== null && dto.seats > plan.seatLimit) {
      throw new BadRequestException(
        `The ${plan.name} plan supports at most ${plan.seatLimit} seat(s).`,
      );
    }

    const now = new Date();
    return this.prisma.tenantSubscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        planId: plan.id,
        seats: dto.seats,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + SUBSCRIPTION_PERIOD_MS),
      },
      update: {
        planId: plan.id,
        seats: dto.seats,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + SUBSCRIPTION_PERIOD_MS),
      },
      include: { plan: true },
    });
  }
}
