import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export const ACCESS_COOKIE = 'pg_at'; // access token (JWT ngắn hạn)
export const REFRESH_COOKIE = 'pg_rt'; // refresh token (opaque, khớp Session trong DB)

export interface AuthedUser {
  id: string;
}

/**
 * Guard xác thực nhẹ: đọc JWT từ httpOnly cookie, gắn req.user = { id }.
 * (Không dùng passport để giảm phụ thuộc — identity context tự quản.)
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
