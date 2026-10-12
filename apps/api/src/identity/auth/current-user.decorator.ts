import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthedUser } from './jwt-auth.guard';

/** Authenticated user (attached to the request by JwtAuthGuard). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthedUser => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthedUser }>();
    return req.user as AuthedUser;
  },
);

/** User if present (optional-auth routes); undefined for guests. */
export const OptionalUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthedUser | undefined => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthedUser }>();
    return req.user;
  },
);
