import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { getRequestContext } from '../tenant-context';

/**
 * TenantContextMiddleware already decoded and verified the access token (if any) before this
 * guard runs — it just never rejects, so anonymous requests can still hit public routes. This
 * guard is what turns "no verified token" into a 401 on routes that require one. It does not
 * re-verify the JWT itself; verification happens exactly once, in the middleware.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    const { userId } = getRequestContext();
    if (!userId) {
      throw new UnauthorizedException('Missing or invalid access token.');
    }
    return true;
  }
}
