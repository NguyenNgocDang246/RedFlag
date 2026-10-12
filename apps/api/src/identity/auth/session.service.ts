import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week, sliding (extended on every rotation)
export const ROTATION_GRACE_MS = 30 * 1000; // the previous refresh token still works this long

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export interface IssuedRefresh {
  userId: string;
  rawToken: string;
  expiresAt: Date;
}

/** `refresh: null` = within the rotation grace window: issue only a new access token. */
export interface RotateResult {
  userId: string;
  refresh: IssuedRefresh | null;
}

/**
 * Refresh tokens stored in the DB (Session model). Only the HASH is stored; the raw token goes to the cookie.
 * Every refresh rotates the token: the old one is invalidated immediately.
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

  /**
   * Rotation: verifies the refresh token, issues a new one on the same Session.
   *
   * Concurrent refreshes with the same token (two tabs, StrictMode, middleware + client) are
   * expected: the winner rotates; a loser within ROTATION_GRACE_MS gets `refresh: null` (issue only
   * a new access token — the browser already holds the winner's refresh cookie). The previous token
   * presented after the grace window = reuse (likely stolen) → the whole session is revoked.
   */
  async rotate(rawToken: string): Promise<RotateResult> {
    const hash = hashToken(rawToken);
    const session = await this.prisma.session.findFirst({
      where: { OR: [{ tokenHash: hash }, { prevTokenHash: hash }] },
    });
    const now = new Date();
    if (!session || session.revokedAt || session.expiresAt < now) {
      throw new UnauthorizedException('Phiên không hợp lệ / Invalid session');
    }

    if (session.tokenHash !== hash) return this.graceOrRevoke(session.id, session.userId, session.rotatedAt, now);

    const newRaw = randomBytes(32).toString('hex');
    const expiresAt = new Date(now.getTime() + REFRESH_TTL_MS);
    // CONDITIONAL hash swap (old hash still in place) — atomic: if two requests refresh with the
    // same token, only one rotates. Each refresh token is single-use.
    const { count } = await this.prisma.session.updateMany({
      where: { id: session.id, tokenHash: hash, revokedAt: null },
      data: { tokenHash: hashToken(newRaw), prevTokenHash: hash, rotatedAt: now, expiresAt, lastUsedAt: now },
    });
    if (count === 0) {
      // Lost the race: if another request just rotated this very token → grace path; if it was
      // revoked meanwhile (logout) → 401.
      const fresh = await this.prisma.session.findUnique({ where: { id: session.id } });
      if (!fresh || fresh.revokedAt || fresh.prevTokenHash !== hash) {
        throw new UnauthorizedException('Phiên không hợp lệ / Invalid session');
      }
      return this.graceOrRevoke(fresh.id, fresh.userId, fresh.rotatedAt, now);
    }
    return { userId: session.userId, refresh: { userId: session.userId, rawToken: newRaw, expiresAt } };
  }

  private async graceOrRevoke(
    sessionId: string,
    userId: string,
    rotatedAt: Date | null,
    now: Date,
  ): Promise<RotateResult> {
    if (rotatedAt && now.getTime() - rotatedAt.getTime() <= ROTATION_GRACE_MS) {
      return { userId, refresh: null };
    }
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: now },
    });
    throw new UnauthorizedException('Phiên không hợp lệ / Invalid session');
  }

  /** Revokes one session by refresh token (logout). No error if not found. */
  async revoke(rawToken: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { tokenHash: hashToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Active sessions of a user, newest activity first; `current` = the one holding `currentRaw`. */
  async list(userId: string, currentRaw?: string) {
    const currentHash = currentRaw ? hashToken(currentRaw) : null;
    const rows = await this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
      select: { id: true, tokenHash: true, prevTokenHash: true, userAgent: true, createdAt: true, lastUsedAt: true },
    });
    return rows.map(({ tokenHash, prevTokenHash, ...r }) => ({
      ...r,
      current: currentHash !== null && (tokenHash === currentHash || prevTokenHash === currentHash),
    }));
  }

  /** Signs out one device. Scoped to the owner (R5); returns false if nothing was revoked. */
  async revokeById(userId: string, id: string): Promise<boolean> {
    const { count } = await this.prisma.session.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return count > 0;
  }

  /** Signs out every other device, keeping the session that holds `currentRaw`. */
  async revokeOthers(userId: string, currentRaw: string | undefined): Promise<void> {
    const hash = currentRaw ? hashToken(currentRaw) : null;
    // Look the current session up first: a `NOT (… OR prevTokenHash = x)` filter would drop every row
    // whose prevTokenHash is NULL (SQL three-valued logic) and revoke nothing.
    const current = hash
      ? await this.prisma.session.findFirst({
          where: { userId, OR: [{ tokenHash: hash }, { prevTokenHash: hash }] },
          select: { id: true },
        })
      : null;
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null, ...(current ? { id: { not: current.id } } : {}) },
      data: { revokedAt: new Date() },
    });
  }

  /** Revokes all of a user's sessions (password change, logout-all). */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
