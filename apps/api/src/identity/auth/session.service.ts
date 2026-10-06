import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 ngày

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export interface IssuedRefresh {
  userId: string;
  rawToken: string;
  expiresAt: Date;
}

/**
 * Quản lý refresh token lưu DB (model Session). Chỉ lưu HASH; raw trả về cho cookie.
 * Mỗi lần refresh -> xoay vòng token (rotation): token cũ hết hiệu lực ngay.
 */
@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, userAgent?: string): Promise<IssuedRefresh> {
    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    await this.prisma.session.create({
      data: { userId, tokenHash: hashToken(rawToken), userAgent, expiresAt },
    });
    return { userId, rawToken, expiresAt };
  }

  /** Xoay vòng: xác thực refresh token cũ, cấp token mới trên cùng Session. */
  async rotate(rawToken: string): Promise<IssuedRefresh> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(rawToken) },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Phiên không hợp lệ / Invalid session');
    }

    const newRaw = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    await this.prisma.session.update({
      where: { id: session.id },
      data: { tokenHash: hashToken(newRaw), expiresAt, lastUsedAt: new Date() },
    });
    return { userId: session.userId, rawToken: newRaw, expiresAt };
  }

  /** Thu hồi một phiên theo refresh token (logout). Không lỗi nếu không tìm thấy. */
  async revoke(rawToken: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { tokenHash: hashToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Thu hồi toàn bộ phiên của user (đổi mật khẩu, logout-all). */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
