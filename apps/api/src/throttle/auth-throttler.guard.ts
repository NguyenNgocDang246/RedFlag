import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { MAIL_THROTTLER } from './throttle.module';

/**
 * Throttles the auth routes on two different keys at once.
 *
 * `ip` counts per caller, as shipped. `mail` counts per address in the body instead, because the
 * thing worth protecting on "send me a link" routes is somebody else's inbox: keyed by IP, one
 * attacker on a handful of addresses could still flood a victim with mail.
 */
@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected generateKey(context: ExecutionContext, suffix: string, name: string): string {
    if (name !== MAIL_THROTTLER) return super.generateKey(context, suffix, name);
    const body = context.switchToHttp().getRequest<{ body?: { email?: unknown } }>().body;
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    return super.generateKey(context, email || suffix, name);
  }
}
