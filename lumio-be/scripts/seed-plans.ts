import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PLANS = [
  {
    code: 'STARTER' as const,
    name: 'Starter',
    priceCentsMo: 4900,
    seatLimit: 5,
    features: { instructors: 1 },
  },
  {
    code: 'GROWTH' as const,
    name: 'Growth',
    priceCentsMo: 19900,
    seatLimit: 50,
    features: { instructors: 10 },
  },
  {
    code: 'ENTERPRISE' as const,
    name: 'Enterprise',
    priceCentsMo: 99900,
    seatLimit: null,
    features: { instructors: null, sso: true },
  },
];

async function main() {
  for (const plan of PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        priceCentsMo: plan.priceCentsMo,
        seatLimit: plan.seatLimit,
        features: plan.features,
      },
      create: plan,
    });
    console.log(`Seeded plan: ${plan.code}`);
  }
  await prisma.$disconnect();
}
main();
