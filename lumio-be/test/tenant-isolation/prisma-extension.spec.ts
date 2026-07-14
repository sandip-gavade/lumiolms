import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * Asserts the core claim behind NFR-3.7: a tenant-scoped Prisma client for tenant A can
 * never read or write tenant B's rows, even if a caller passes B's id explicitly. This is
 * the automated isolation test the requirements doc calls for before any module builds on
 * top of PrismaService.
 */
describe('PrismaService tenant isolation', () => {
  let prisma: PrismaService;
  let tenantAId: string;
  let tenantBId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();

    const [a, b] = await Promise.all([
      prisma.tenant.create({ data: { name: 'Tenant A', subdomain: `tenant-a-${Date.now()}` } }),
      prisma.tenant.create({ data: { name: 'Tenant B', subdomain: `tenant-b-${Date.now()}` } }),
    ]);
    tenantAId = a.id;
    tenantBId = b.id;
  });

  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
    await prisma.onModuleDestroy();
  });

  it('scopes creates to the active tenant regardless of caller-supplied tenantId', async () => {
    const scopedAsA = prisma.tenantScoped(tenantAId) as unknown as PrismaClient;
    const category = await (scopedAsA as any).category.create({
      data: { name: 'Design', slug: `design-${Date.now()}`, tenantId: tenantBId }, // attempted spoof
    });
    expect(category.tenantId).toBe(tenantAId);
  });

  it("cannot read tenant B's rows through a client scoped to tenant A", async () => {
    const scopedAsB = prisma.tenantScoped(tenantBId) as unknown as PrismaClient;
    const bOnly = await (scopedAsB as any).category.create({
      data: { name: 'B-only category', slug: `b-only-${Date.now()}` },
    });

    const scopedAsA = prisma.tenantScoped(tenantAId) as unknown as PrismaClient;
    const leaked = await (scopedAsA as any).category.findUnique({ where: { id: bOnly.id } });
    expect(leaked).toBeNull();

    const found = await (scopedAsB as any).category.findUnique({ where: { id: bOnly.id } });
    expect(found?.id).toBe(bOnly.id);
  });

  it('findMany never crosses tenant boundaries', async () => {
    const scopedAsA = prisma.tenantScoped(tenantAId) as unknown as PrismaClient;
    const scopedAsB = prisma.tenantScoped(tenantBId) as unknown as PrismaClient;
    await (scopedAsA as any).category.create({ data: { name: 'A-1', slug: `a-1-${Date.now()}` } });
    await (scopedAsB as any).category.create({ data: { name: 'B-1', slug: `b-1-${Date.now()}` } });

    const aCategories = await (scopedAsA as any).category.findMany({});
    expect(aCategories.every((c: { tenantId: string }) => c.tenantId === tenantAId)).toBe(true);
  });
});
