import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { requestContextStorage } from '../tenant-context';
import { AccessTokenClaims, TokenService } from '../token.service';

/**
 * Populates the AsyncLocalStorage request context (tenant-context.ts) before any
 * guard/controller runs, so PrismaService's tenant extension always has a tenantId to
 * enforce. Two resolution paths, matching FR-1.1:
 *  1. Authenticated requests: the tenant UUID comes straight from the access token's
 *     `tenantId` claim (set at login from the chosen Membership) — no DB lookup needed.
 *  2. Anonymous requests (public catalog browsing): resolved from the subdomain
 *     (`{org}.lumio.app`) via a slug -> id lookup, or an `x-tenant-id` header carrying the
 *     tenant UUID directly for local dev/tooling, where localhost has no subdomain.
 *
 * This middleware only populates context — it never rejects a request. JwtAuthGuard (see
 * common/guards) is what turns "no userId in context" into a 401 on routes that need one.
 * TODO(perf): cache the subdomain -> tenantId lookup in Redis once notifications/jobs land —
 * it's a bare Prisma call per anonymous request today.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    let claims: AccessTokenClaims | null = null;
    const authHeader = req.header('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        claims = this.tokens.verifyAccessToken(
          authHeader.slice('Bearer '.length),
        );
      } catch {
        claims = null; // invalid/expired token — leave context unauthenticated, guard rejects later
      }
    }

    let tenantId = claims?.tenantId ?? req.header('x-tenant-id') ?? null;
    if (!tenantId) {
      const slug = this.resolveSubdomain(req.hostname);
      if (slug) {
        tenantId = await this.prisma.resolveTenantIdBySlug(slug);
      }
    }

    requestContextStorage.run(
      {
        tenantId,
        userId: claims?.sub ?? null,
        roles: claims?.roles ?? [],
        isSuperAdmin: claims?.isSuperAdmin ?? false,
      },
      () => next(),
    );
  }

  private resolveSubdomain(hostname: string): string | null {
    const parts = hostname.split('.');
    // "acme.lumio.app" -> "acme"; "localhost" / "lumio.app" -> no tenant subdomain present
    if (parts.length < 3) return null;
    const sub = parts[0];
    return sub === 'www' ? null : sub;
  }
}
