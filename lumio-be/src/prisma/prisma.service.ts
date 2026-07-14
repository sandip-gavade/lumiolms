import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Scope,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { getRequestContext } from '../common/tenant-context';

/**
 * Models that carry a direct `tenantId` scalar column. Every read/write against one of these
 * is auto-scoped to the current request's tenant by the extension below — see
 * docs/requirements.md NFR-3.7 ("enforced centrally ... not left to each query").
 *
 * Deliberately NOT covered here (tenant-scoped only indirectly, via a parent relation):
 * CourseSection, Lecture, LectureResource, CartItem, OrderItem, Refund, Answer,
 * RefreshToken/PasswordResetToken/EmailVerificationToken (user-scoped, not tenant-scoped).
 * Query those through their scoped parent (e.g. `course.findFirst({ where: { id, tenantId },
 * include: { sections: true } })`), never directly by their own id alone.
 */
const TENANT_SCOPED_MODELS = new Set<Prisma.ModelName>([
  'TenantSubscription',
  'Membership',
  'Category',
  'Course',
  'Cart',
  'Coupon',
  'Order',
  'Enrollment',
  'InstructorPayoutLedgerEntry',
  'LectureProgress',
  'Note',
  'Question',
  'Certificate',
  'Announcement',
  'Notification',
  'NotificationPreference',
  'Review',
  'AuditLog',
]);

const READ_OPS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
]);
const UNIQUE_READ_OPS = new Set(['findUnique', 'findUniqueOrThrow']);
const WRITE_MANY_OPS = new Set(['updateMany', 'deleteMany']);

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Escape hatch for the handful of call sites that must run before a tenant is known
   * (subdomain -> tenantId resolution, super-admin cross-tenant queries). Everything else
   * should go through the tenant-scoped extended client — inject `PrismaService` normally
   * and Nest will hand you `tenantScoped()`'s output via the provider below.
   */
  async resolveTenantIdBySlug(slug: string): Promise<string | null> {
    const tenant = await this.tenant.findUnique({
      where: { subdomain: slug },
      select: { id: true, status: true },
    });
    if (!tenant || tenant.status !== 'ACTIVE') return null;
    return tenant.id;
  }

  /** Returns a Prisma Client extended to auto-scope every tenant-owned model to `tenantId`. */
  tenantScoped(tenantId: string) {
    return this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            if (
              !model ||
              !TENANT_SCOPED_MODELS.has(model as Prisma.ModelName)
            ) {
              return query(args);
            }
            const a = args as Record<string, any>;

            if (
              READ_OPS.has(operation) ||
              WRITE_MANY_OPS.has(operation) ||
              UNIQUE_READ_OPS.has(operation) ||
              operation === 'update' ||
              operation === 'delete' ||
              operation === 'upsert'
            ) {
              // Prisma's WhereUniqueInput permits extra non-unique fields alongside the
              // unique key, so a flat merge scopes findUnique/update/delete/upsert too —
              // no need to (and no way to, without breaking the unique-input type) wrap in AND.
              a.where = { ...(a.where ?? {}), tenantId };
            }
            if (operation === 'create') {
              a.data = { ...(a.data ?? {}), tenantId };
            } else if (operation === 'createMany') {
              a.data = Array.isArray(a.data)
                ? a.data.map((row: Record<string, any>) => ({
                    ...row,
                    tenantId,
                  }))
                : a.data;
            } else if (operation === 'upsert') {
              a.create = { ...(a.create ?? {}), tenantId };
            }

            return query(a);
          },
        },
      },
    });
  }
}

export type TenantScopedPrisma = ReturnType<PrismaService['tenantScoped']>;

/**
 * Injectable that resolves to a request-scoped, tenant-extended Prisma client using the
 * ambient AsyncLocalStorage context (populated by TenantContextMiddleware). Prefer this in
 * module services over injecting PrismaService directly whenever the query touches a
 * tenant-scoped model.
 */
export const TENANT_PRISMA = Symbol('TENANT_PRISMA');

export const tenantPrismaProvider = {
  provide: TENANT_PRISMA,
  scope: Scope.REQUEST, // re-resolved per request so it always picks up the current AsyncLocalStorage tenant
  useFactory: (prisma: PrismaService) =>
    prisma.tenantScoped(getRequestContext().tenantId!),
  inject: [PrismaService],
};
