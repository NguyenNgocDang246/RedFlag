import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export const ACCESS_COOKIE = 'rf_access'; // short-lived JWT
export const REFRESH_COOKIE = 'rf_refresh'; // opaque, matches a Session in the DB
// "Has session" flag (no secret, path /): the web middleware can't see rf_refresh (path /api/auth),
// so it uses this flag to tell guests apart from users whose access token just expired.
export const SESSION_MARKER_COOKIE = 'rf_session';
/** Access token lifetime (JWT exp + cookie maxAge) — single source of truth. */
export const ACCESS_TTL_SEC = 5 * 60;

export interface AuthedUser {
  id: string;
}

/**
 * Lightweight auth guard: reads the JWT from an httpOnly cookie and sets req.user = { id }.
 * (No passport, to keep dependencies down.)
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthedUser }>();
    const token = req.cookies?.[ACCESS_COOKIE] as string | undefined;
    if (!token) throw new UnauthorizedException('Not authenticated');

    try {
      const payload = this.jwt.verify<{ sub: string }>(token);
      req.user = { id: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid session');
    }
  }
}
