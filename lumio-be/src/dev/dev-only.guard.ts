import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

/**
 * Belt-and-suspenders alongside DevModule not being registered at all when
 * NODE_ENV === 'production' (see app.module.ts) — this is what fires if that condition is
 * ever accidentally bypassed (e.g. the module gets imported somewhere else later). 404, not
 * 403: a route that hands out an admin token with zero credentials shouldn't even confirm
 * its own existence in an environment where it's not supposed to run.
 */
@Injectable()
export class DevOnlyGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }
    return true;
  }
}
