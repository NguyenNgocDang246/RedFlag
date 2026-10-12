import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MailService } from '../../mail/mail.service';
import type { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';
import { ResetTokenService } from './reset-token';

interface Row {
  id: string;
  email: string;
  passwordHash: string | null;
  googleId: string | null;
  locale: 'en' | 'vi';
  role: string;
  emailVerifiedAt: Date | null;
}

function fakePrisma(rows: Row[]) {
  const verifications: { userId: string; token: string; consumedAt: Date | null }[] = [];
  const user = {
    findUnique: async ({ where }: { where: { email?: string; id?: string } }) =>
      rows.find(
        (r) =>
          (where.email !== undefined && r.email === where.email) ||
          (where.id !== undefined && r.id === where.id),
      ) ?? null,
    update: async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
      const row = rows.find((r) => r.id === where.id)!;
      Object.assign(row, data);
      return row;
    },
  };
  const emailVerification = {
    updateMany: async ({ data }: { data: { consumedAt: Date } }) => {
      const open = verifications.filter((v) => v.consumedAt === null);
      for (const v of open) v.consumedAt = data.consumedAt;
      return { count: open.length };
    },
    create: async ({ data }: { data: { userId: string; token: string } }) => {
      const row = { userId: data.userId, token: data.token, consumedAt: null };
      verifications.push(row);
      return row;
    },
  };
  const prisma = {
    user,
    emailVerification,
    // The service only ever passes an array of already-started promises.
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  } as unknown as PrismaService;
  return { prisma, verifications };
}

function makeRow(over: Partial<Row> = {}): Row {
  return {
    id: 'u1',
    email: 'user@example.com',
    passwordHash: bcrypt.hashSync('old-password', 4),
    googleId: null,
    locale: 'en',
    role: 'user',
    emailVerifiedAt: new Date(),
    ...over,
  };
}

describe('AuthService: recovery flows', () => {
  const send = vi.fn(async () => undefined);

  const build = (rows: Row[]) => {
    process.env.SESSION_SECRET = 'test-session-secret';
    process.env.WEB_PUBLIC_URL = 'http://web.test';
    const { prisma, verifications } = fakePrisma(rows);
    const jwt = new JwtService({ secret: 'test-session-secret' });
    const mail = { send } as unknown as MailService;
    return {
      verifications,
      service: new AuthService(prisma, jwt, mail, new ResetTokenService(jwt)),
    };
  };

  /** The reset link we just mailed, as the user would open it. */
  const mailedResetToken = (): string => {
    const html = send.mock.calls.at(-1)![2] as string;
    return decodeURIComponent(/reset-password\?token=([^&"]+)/.exec(html)![1]);
  };

  beforeEach(() => {
    send.mockClear();
  });

  it('mails a reset link that works once and not twice', async () => {
    const rows = [makeRow()];
    const { service } = build(rows);

    await service.requestPasswordReset('USER@example.com');
    const token = mailedResetToken();

    await expect(service.resetPassword(token, 'brand-new-password')).resolves.toBe('u1');
    expect(await bcrypt.compare('brand-new-password', rows[0].passwordHash!)).toBe(true);

    // The fingerprint moved with the password, so the same link is now dead.
    await expect(service.resetPassword(token, 'another-password')).rejects.toThrow();
  });

  it('does not confirm the email address — only the verify flow does that', async () => {
    const rows = [makeRow({ emailVerifiedAt: null })];
    const { service } = build(rows);

    await service.requestPasswordReset('user@example.com');
    await service.resetPassword(mailedResetToken(), 'brand-new-password');

    expect(rows[0].emailVerifiedAt).toBeNull();
  });

  it('rejects a made-up token', async () => {
    const { service } = build([makeRow()]);
    await expect(service.resetPassword('not-a-token', 'brand-new-password')).rejects.toThrow();
  });

  it('answers the same for an unknown address, and mails nobody', async () => {
    const { service } = build([makeRow()]);
    await expect(service.requestPasswordReset('stranger@example.com')).resolves.toEqual({
      ok: true,
    });
    expect(send).not.toHaveBeenCalled();
  });

  it('tells a Google-only account where to sign in instead of mailing a reset link', async () => {
    const { service } = build([makeRow({ passwordHash: null, googleId: 'g1' })]);
    await service.requestPasswordReset('user@example.com', 'vi');

    expect(send).toHaveBeenCalledTimes(1);
    const html = send.mock.calls[0][2] as string;
    expect(html).not.toContain('reset-password?token=');
    expect(html).toContain('/login?locale=vi');
  });

  it('resends a confirmation link and kills the previous one', async () => {
    const { service, verifications } = build([makeRow({ emailVerifiedAt: null })]);

    await service.resendVerification('user@example.com');
    await service.resendVerification('user@example.com');

    expect(verifications).toHaveLength(2);
    expect(verifications[0].consumedAt).not.toBeNull();
    expect(verifications[1].consumedAt).toBeNull();
  });

  it('stays quiet for an address that is already confirmed or unknown', async () => {
    const { service, verifications } = build([makeRow()]);

    await expect(service.resendVerification('user@example.com')).resolves.toEqual({ ok: true });
    await expect(service.resendVerification('stranger@example.com')).resolves.toEqual({ ok: true });
    expect(verifications).toHaveLength(0);
    expect(send).not.toHaveBeenCalled();
  });

  it('requires the current password when there is one', async () => {
    const rows = [makeRow()];
    const { service } = build(rows);

    await expect(service.changePassword('u1', 'wrong', 'brand-new-password')).rejects.toThrow();
    await expect(service.changePassword('u1', undefined, 'brand-new-password')).rejects.toThrow();
    await service.changePassword('u1', 'old-password', 'brand-new-password');
    expect(await bcrypt.compare('brand-new-password', rows[0].passwordHash!)).toBe(true);
  });

  it('lets a Google-only account set its first password without one', async () => {
    const rows = [makeRow({ passwordHash: null, googleId: 'g1' })];
    const { service } = build(rows);

    await service.changePassword('u1', undefined, 'brand-new-password');
    expect(await bcrypt.compare('brand-new-password', rows[0].passwordHash!)).toBe(true);
  });

  it('tells the owner their password changed, and does not fail when the mail does', async () => {
    const rows = [makeRow()];
    const { service } = build(rows);
    send.mockRejectedValueOnce(new Error('smtp is down'));

    await expect(
      service.changePassword('u1', 'old-password', 'brand-new-password'),
    ).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledTimes(1);
  });
});
