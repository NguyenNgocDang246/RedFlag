import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { ACCESS_COOKIE, type AuthedUser } from '../identity/auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Admin route guard: authenticates like JwtAuthGuard, then checks the role in the DB
 * (the JWT only carries `sub`; the DB lookup makes revocation take effect immediately).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthedUser }>();
    const token = req.cookies?.[ACCESS_COOKIE] as string | undefined;
    if (!token) throw new UnauthorizedException('Not authenticated');

    let userId: string;
    try {
      userId = this.jwt.verify<{ sub: string }>(token).sub;
    } catch {
      throw new UnauthorizedException('Invalid session');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) throw new UnauthorizedException('Invalid session');
    if (user.role !== 'admin') throw new ForbiddenException('Admin only');
    req.user = { id: userId };
    return true;
  }
}
