import { createHash } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service';
import { ROTATION_GRACE_MS, SessionService } from './session.service';

const hash = (raw: string) => createHash('sha256').update(raw).digest('hex');

interface Row {
  id: string;
  userId: string;
  tokenHash: string;
  prevTokenHash: string | null;
  rotatedAt: Date | null;
  expiresAt: Date;
  revokedAt: Date | null;
  lastUsedAt: Date;
}

/** Minimal in-memory stand-in for the Session queries SessionService.rotate uses. */
function fakePrisma(rows: Row[]) {
  const matches = (row: Row, where: Record<string, unknown>) =>
    Object.entries(where).every(([k, v]) => row[k as keyof Row] === v);
  const session = {
    findFirst: async ({ where }: { where: { OR: Record<string, unknown>[] } }) =>
      rows.find((r) => where.OR.some((w) => matches(r, w))) ?? null,
    findUnique: async ({ where }: { where: { id: string } }) => rows.find((r) => r.id === where.id) ?? null,
    updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Partial<Row> }) => {
      const hit = rows.filter((r) => matches(r, where));
      for (const r of hit) Object.assign(r, data);
      return { count: hit.length };
    },
  };
  return { session } as unknown as PrismaService;
}

function makeRow(raw: string, over: Partial<Row> = {}): Row {
  return {
    id: 's1',
    userId: 'u1',
    tokenHash: hash(raw),
    prevTokenHash: null,
    rotatedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    lastUsedAt: new Date(),
    ...over,
  };
}

describe('SessionService.rotate', () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date('2026-10-12T00:00:00Z') }));
  afterEach(() => vi.useRealTimers());

  it('rotates the current token and remembers the previous one', async () => {
    const row = makeRow('old');
    const svc = new SessionService(fakePrisma([row]));
    const out = await svc.rotate('old');
    expect(out.refresh).not.toBeNull();
    expect(row.tokenHash).toBe(hash(out.refresh!.rawToken));
    expect(row.prevTokenHash).toBe(hash('old'));
    expect(row.expiresAt.getTime()).toBe(Date.now() + 7 * 24 * 60 * 60 * 1000);
  });

  it('accepts the previous token within the grace window without rotating again', async () => {
    const row = makeRow('old');
    const svc = new SessionService(fakePrisma([row]));
    const first = await svc.rotate('old');
    vi.advanceTimersByTime(ROTATION_GRACE_MS - 1000);
    const second = await svc.rotate('old');
    expect(second).toEqual({ userId: 'u1', refresh: null });
    expect(row.tokenHash).toBe(hash(first.refresh!.rawToken));
    expect(row.revokedAt).toBeNull();
  });

  it('revokes the whole session when the previous token is reused after the grace window', async () => {
    const row = makeRow('old');
    const svc = new SessionService(fakePrisma([row]));
    const first = await svc.rotate('old');
    vi.advanceTimersByTime(ROTATION_GRACE_MS + 1000);
    await expect(svc.rotate('old')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(row.revokedAt).not.toBeNull();
    await expect(svc.rotate(first.refresh!.rawToken)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects unknown, expired and revoked sessions', async () => {
    await expect(new SessionService(fakePrisma([])).rotate('x')).rejects.toBeInstanceOf(UnauthorizedException);
    const expired = makeRow('a', { expiresAt: new Date(Date.now() - 1) });
    await expect(new SessionService(fakePrisma([expired])).rotate('a')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    const revoked = makeRow('b', { revokedAt: new Date() });
    await expect(new SessionService(fakePrisma([revoked])).rotate('b')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('takes the grace path when it loses the rotation race', async () => {
    const row = makeRow('old');
    const prisma = fakePrisma([row]);
    // Simulate a concurrent winner rotating between our read and our conditional update.
    const realUpdate = prisma.session.updateMany.bind(prisma.session);
    prisma.session.updateMany = (async (args: never) => {
      Object.assign(row, { tokenHash: hash('winner'), prevTokenHash: hash('old'), rotatedAt: new Date() });
      return realUpdate(args);
    }) as never;
    const out = await new SessionService(prisma).rotate('old');
    expect(out).toEqual({ userId: 'u1', refresh: null });
    expect(row.tokenHash).toBe(hash('winner'));
  });
});

describe('SessionService.revokeOthers', () => {
  it('keeps the current session (looked up by id, not a NULL-unsafe NOT filter)', async () => {
    const findFirst = vi.fn(async () => ({ id: 'mine' }));
    const updateMany = vi.fn(async () => ({ count: 2 }));
    const prisma = { session: { findFirst, updateMany } } as unknown as PrismaService;
    await new SessionService(prisma).revokeOthers('u1', 'raw');
    expect(findFirst).toHaveBeenCalledWith({
      where: { userId: 'u1', OR: [{ tokenHash: hash('raw') }, { prevTokenHash: hash('raw') }] },
      select: { id: true },
    });
    expect(updateMany.mock.calls[0][0]).toMatchObject({
      where: { userId: 'u1', revokedAt: null, id: { not: 'mine' } },
    });
  });
});
