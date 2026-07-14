import { createHash, createHmac, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export interface AccessTokenClaims {
  sub: string; // userId
  tenantId: string | null;
  roles: string[];
  isSuperAdmin: boolean;
}

const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const VERIFICATION_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour (password reset / email verify)

/**
 * Access tokens are stateless JWTs (short TTL, never persisted — see
 * TenantContextMiddleware, which is the only other place these are decoded).
 * Refresh/reset/verification tokens are opaque random strings: only their hash lives in the
 * DB, so a database read alone can't be replayed as a live token.
 */
@Injectable()
export class TokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  constructor(private readonly config: ConfigService) {
    this.accessSecret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  signAccessToken(claims: AccessTokenClaims): string {
    return jwt.sign(claims, this.accessSecret, { expiresIn: ACCESS_TOKEN_TTL });
  }

  verifyAccessToken(token: string): AccessTokenClaims {
    return jwt.verify(token, this.accessSecret) as unknown as AccessTokenClaims;
  }

  /** Returns the raw token (send to the client) — never store this value itself. */
  generateOpaqueToken(): string {
    return randomBytes(32).toString('base64url');
  }

  /** HMAC keyed by JWT_REFRESH_SECRET — a stolen DB dump alone can't be turned into a valid
   *  refresh token without also knowing this server-side secret. */
  hashRefreshToken(token: string): string {
    return createHmac('sha256', this.refreshSecret).update(token).digest('hex');
  }

  /** Plain SHA-256 is sufficient here: these are single-use, short-lived, and mailed to the
   *  user directly rather than being a bearer credential kept alive for a session. */
  hashVerificationToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
