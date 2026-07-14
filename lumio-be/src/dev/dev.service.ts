import { Injectable, Logger } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthResult, AuthService } from '../modules/auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

const BCRYPT_ROUNDS = 12;
const DEV_TENANT_SUBDOMAIN = 'dev';
const DEV_PASSWORD = 'devpassword123';

/**
 * Local-only shortcut so exploring the API via /docs doesn't require the curl bootstrap
 * dance (POST /tenants -> copy tenantId -> POST /auth/login -> copy token). Everything here
 * is idempotent — repeated calls reuse the same dev tenant and per-role user instead of
 * piling up junk rows, so it's safe to hit on every Swagger UI reload.
 */
@Injectable()
export class DevService {
  private readonly logger = new Logger(DevService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async quickLogin(
    role: MembershipRole = 'ORG_ADMIN',
  ): Promise<AuthResult & { note: string }> {
    const tenant = await this.prisma.tenant.upsert({
      where: { subdomain: DEV_TENANT_SUBDOMAIN },
      update: {},
      create: {
        name: 'Dev Org',
        subdomain: DEV_TENANT_SUBDOMAIN,
        status: 'ACTIVE',
      },
    });

    const email = `dev-${role.toLowerCase()}@local.test`;
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name: `Dev ${role}`,
          passwordHash: await bcrypt.hash(DEV_PASSWORD, BCRYPT_ROUNDS),
          emailVerifiedAt: new Date(),
        },
      });
      this.logger.log(`Created dev user ${email} (password: ${DEV_PASSWORD})`);
    }

    const existingMembership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId_role: { userId: user.id, tenantId: tenant.id, role },
      },
    });
    if (!existingMembership) {
      await this.prisma.membership.create({
        data: { userId: user.id, tenantId: tenant.id, role },
      });
    } else if (existingMembership.status !== 'ACTIVE') {
      await this.prisma.membership.update({
        where: { id: existingMembership.id },
        data: { status: 'ACTIVE' },
      });
    }

    const session = await this.auth.issueSession(user, tenant.id, [role]);
    return {
      ...session,
      note: `Dev tenant "${DEV_TENANT_SUBDOMAIN}" · login: ${email} / ${DEV_PASSWORD}`,
    };
  }
}
