import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthResult, AuthService } from '../auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantBrandingDto } from './dto/update-tenant-branding.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class TenancyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  /**
   * Self-serve org signup (FR-0.1). Runs with no tenant resolved yet — this is the one place
   * in the app that legitimately creates a Tenant row outside a super-admin action. If
   * `adminEmail` already belongs to an existing account, that account is granted ORG_ADMIN in
   * the new tenant (proving ownership via password) rather than erroring — consistent with
   * the Membership model letting one account belong to multiple tenants.
   */
  async createTenant(
    dto: CreateTenantDto,
  ): Promise<
    AuthResult & { tenant: { id: string; name: string; subdomain: string } }
  > {
    if (CreateTenantDto.isReservedSubdomain(dto.subdomain)) {
      throw new ConflictException(`Subdomain "${dto.subdomain}" is reserved.`);
    }
    const subdomainTaken = await this.prisma.tenant.findUnique({
      where: { subdomain: dto.subdomain },
      select: { id: true },
    });
    if (subdomainTaken) {
      throw new ConflictException(
        `Subdomain "${dto.subdomain}" is already in use.`,
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.adminEmail },
    });
    if (existingUser) {
      if (
        !existingUser.passwordHash ||
        !(await bcrypt.compare(dto.adminPassword, existingUser.passwordHash))
      ) {
        throw new UnauthorizedException(
          'An account with this email already exists; the password did not match it.',
        );
      }
    }

    const passwordHash = existingUser
      ? existingUser.passwordHash!
      : await bcrypt.hash(dto.adminPassword, BCRYPT_ROUNDS);

    const { tenant, user } = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: dto.orgName, subdomain: dto.subdomain },
      });
      const user =
        existingUser ??
        (await tx.user.create({
          data: { email: dto.adminEmail, name: dto.adminName, passwordHash },
        }));
      await tx.membership.create({
        data: { userId: user.id, tenantId: tenant.id, role: 'ORG_ADMIN' },
      });
      return { tenant, user };
    });

    const session = await this.auth.issueSession(user, tenant.id, [
      'ORG_ADMIN',
    ]);
    return {
      ...session,
      tenant: { id: tenant.id, name: tenant.name, subdomain: tenant.subdomain },
    };
  }

  async getMine(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        subdomain: true,
        customDomain: true,
        logoUrl: true,
        primaryColor: true,
        status: true,
        createdAt: true,
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found.');
    return tenant;
  }

  async updateBranding(tenantId: string, dto: UpdateTenantBrandingDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found.');
    if (tenant.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'This organization is not currently active.',
      );
    }
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: dto.name,
        logoUrl: dto.logoUrl,
        primaryColor: dto.primaryColor,
      },
    });
  }
}
