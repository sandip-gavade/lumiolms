import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MembershipRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { getTenantId } from '../../common/tenant-context';
import {
  AccessTokenClaims,
  REFRESH_TOKEN_TTL_MS,
  TokenService,
  VERIFICATION_TOKEN_TTL_MS,
} from '../../common/token.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailQueueService } from '../notifications/email-queue.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDto } from './dto/signup.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

const BCRYPT_ROUNDS = 12;

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string; avatarUrl: string | null };
  tenantId: string;
  roles: MembershipRole[];
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient: OAuth2Client | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly emailQueue: EmailQueueService,
    private readonly config: ConfigService,
  ) {
    const googleClientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    this.googleClient = googleClientId
      ? new OAuth2Client(googleClientId)
      : null;
  }

  async signup(dto: SignupDto): Promise<AuthResult> {
    const tenantId = getTenantId();
    await this.assertTenantActive(tenantId);

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      // Deliberately no account-linking flow in v1 — see docs/requirements.md open items.
      throw new ConflictException(
        'An account with this email already exists. Log in instead.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: { email: dto.email, name: dto.name, passwordHash },
    });
    await this.prisma.membership.create({
      data: { userId: user.id, tenantId, role: 'STUDENT' },
    });

    await this.sendVerificationEmail(user.id, user.email, user.name);

    return this.issueSession(user, tenantId, ['STUDENT']);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const tenantId = getTenantId();
    await this.assertTenantActive(tenantId);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (
      !user?.passwordHash ||
      !(await bcrypt.compare(dto.password, user.passwordHash))
    ) {
      // Same message whether the email doesn't exist or the password is wrong — don't leak
      // which one it was.
      throw new UnauthorizedException('Invalid email or password.');
    }

    const roles = await this.activeRolesFor(user.id, tenantId);
    // A platform super-admin has no Membership of their own (see docs/requirements.md —
    // isSuperAdmin is a User-level flag, independent of any tenant membership) and must
    // still be able to authenticate through a tenant's subdomain to reach cross-tenant
    // super-admin routes.
    if (roles.length === 0 && !user.isSuperAdmin) {
      throw new ForbiddenException(
        'This account has no access to this organization.',
      );
    }

    return this.issueSession(user, tenantId, roles);
  }

  async loginWithGoogle(dto: GoogleLoginDto): Promise<AuthResult> {
    if (!this.googleClient) {
      throw new ForbiddenException(
        'Google sign-in is not configured on this server.',
      );
    }
    const tenantId = getTenantId();
    await this.assertTenantActive(tenantId);

    const ticket = await this.googleClient.verifyIdToken({
      idToken: dto.idToken,
      audience: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.sub) {
      throw new UnauthorizedException('Invalid Google credential.');
    }

    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: payload.sub }, { email: payload.email }] },
    });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name ?? payload.email,
          avatarUrl: payload.picture,
          googleId: payload.sub,
          emailVerifiedAt: payload.email_verified ? new Date() : null,
        },
      });
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: payload.sub },
      });
    }

    let roles = await this.activeRolesFor(user.id, tenantId);
    if (roles.length === 0) {
      // First time this Google identity has touched this tenant — same default a
      // password signup gets. Reject instead if invite-only enrollment is ever required.
      await this.prisma.membership.create({
        data: { userId: user.id, tenantId, role: 'STUDENT' },
      });
      roles = ['STUDENT'];
    }

    return this.issueSession(user, tenantId, roles);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const tokenHash = this.tokens.hashRefreshToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token.');
    }
    if (stored.revokedAt) {
      // Reuse of an already-rotated token is a strong signal of theft (stolen token used
      // after the legitimate client rotated past it) — burn every session for this user.
      this.logger.warn(
        `Refresh token reuse detected for user ${stored.userId}; revoking all sessions.`,
      );
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException(
        'Refresh token has already been used. Please log in again.',
      );
    }
    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired.');
    }
    if (!stored.tenantId) {
      throw new UnauthorizedException(
        'Refresh token has no associated tenant.',
      );
    }

    const [user, roles] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: stored.userId } }),
      this.activeRolesFor(stored.userId, stored.tenantId),
    ]);
    if (roles.length === 0 && !user.isSuperAdmin) {
      throw new ForbiddenException(
        'This account no longer has access to this organization.',
      );
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueSession(user, stored.tenantId, roles);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.tokens.hashRefreshToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) return; // don't reveal whether the email is registered

    const rawToken = this.tokens.generateOpaqueToken();
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.tokens.hashVerificationToken(rawToken),
        expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
      },
    });

    await this.emailQueue.enqueue({
      type: 'password-reset',
      to: user.email,
      name: user.name,
      resetUrl: `${this.appUrl()}/reset-password?token=${rawToken}`,
    });
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = this.tokens.hashVerificationToken(dto.token);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException(
        'This password reset link is invalid or has expired.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Changing the password invalidates every existing session, not just this device.
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<void> {
    const tokenHash = this.tokens.hashVerificationToken(dto.token);
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException(
        'This verification link is invalid or has expired.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  // ─────────────────────────────────────────────────────────────────────

  private async sendVerificationEmail(
    userId: string,
    email: string,
    name: string,
  ): Promise<void> {
    const rawToken = this.tokens.generateOpaqueToken();
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: this.tokens.hashVerificationToken(rawToken),
        expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
      },
    });
    await this.emailQueue.enqueue({
      type: 'verify-email',
      to: email,
      name,
      verifyUrl: `${this.appUrl()}/verify-email?token=${rawToken}`,
    });
  }

  /** All ACTIVE Membership roles this user holds in this tenant — a user can hold more than
   *  one (e.g. STUDENT + INSTRUCTOR) simultaneously in the same tenant. */
  private async activeRolesFor(
    userId: string,
    tenantId: string,
  ): Promise<MembershipRole[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId, tenantId, status: 'ACTIVE' },
      select: { role: true },
    });
    return memberships.map((m) => m.role);
  }

  private async assertTenantActive(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { status: true },
    });
    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'This organization is not currently active.',
      );
    }
  }

  /** Public: also used by TenancyService to log a new org's first admin straight in after
   *  self-serve tenant signup, without duplicating token-issuance logic. */
  async issueSession(
    user: {
      id: string;
      email: string;
      name: string;
      avatarUrl: string | null;
      isSuperAdmin: boolean;
    },
    tenantId: string,
    roles: MembershipRole[],
  ): Promise<AuthResult> {
    const claims: AccessTokenClaims = {
      sub: user.id,
      tenantId,
      roles,
      isSuperAdmin: user.isSuperAdmin,
    };
    const accessToken = this.tokens.signAccessToken(claims);

    const rawRefreshToken = this.tokens.generateOpaqueToken();
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tenantId,
        tokenHash: this.tokens.hashRefreshToken(rawRefreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      tenantId,
      roles,
    };
  }

  private appUrl(): string {
    return this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
  }
}
