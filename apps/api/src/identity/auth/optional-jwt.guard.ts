import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { ACCESS_COOKIE, type AuthedUser } from './jwt-auth.guard';

/**
 * Optional guard: sets req.user if the access token is valid, otherwise still lets the request through.
 * For routes that serve both guests and users (Training — guests get a reduced set).
 */
@Injectable()
export class OptionalJwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthedUser }>();
    const token = req.cookies?.[ACCESS_COOKIE] as string | undefined;
    if (token) {
      try {
        const payload = this.jwt.verify<{ sub: string }>(token);
        req.user = { id: payload.sub };
      } catch {
        // broken/expired token -> treat as guest
      }
    }
    return true;
  }
}
