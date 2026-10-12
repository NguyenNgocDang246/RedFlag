import { JwtService } from '@nestjs/jwt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AuthService } from './auth.service';
import { GoogleService } from './google.service';

const CLIENT_ID = 'client-id.apps.googleusercontent.com';

interface Row {
  id: string;
  email: string;
  googleId: string | null;
  name: string | null;
  role: string;
  emailVerifiedAt: Date | null;
}

/** In-memory stand-in for the User queries GoogleService makes. */
function fakePrisma(rows: Row[]) {
  let seq = rows.length;
  const user = {
    findUnique: async ({ where }: { where: { googleId?: string; email?: string; id?: string } }) =>
      rows.find(
        (r) =>
          (where.googleId !== undefined && r.googleId === where.googleId) ||
          (where.email !== undefined && r.email === where.email) ||
          (where.id !== undefined && r.id === where.id),
      ) ?? null,
    update: async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
      const row = rows.find((r) => r.id === where.id)!;
      Object.assign(row, data);
      return row;
    },
    create: async ({ data }: { data: Partial<Row> }) => {
      const row: Row = {
        id: `u${++seq}`,
        email: data.email!,
        googleId: data.googleId ?? null,
        name: data.name ?? null,
        role: 'user',
        emailVerifiedAt: data.emailVerifiedAt ?? null,
      };
      rows.push(row);
      return row;
    },
  };
  return { rows, prisma: { user } as unknown as PrismaService };
}

/** An id_token is only ever read, never verified by signature (see GoogleService), so this is enough. */
function idToken(claims: Record<string, unknown>): string {
  const part = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
  return `${part({ alg: 'RS256' })}.${part(claims)}.signature`;
}

function baseClaims(over: Record<string, unknown> = {}) {
  return {
    sub: 'google-sub-1',
    aud: CLIENT_ID,
    iss: 'https://accounts.google.com',
    exp: Math.floor(Date.now() / 1000) + 300,
    email: 'Someone@Example.com',
    email_verified: true,
    name: 'Someone',
    ...over,
  };
}

describe('GoogleService', () => {
  const issueVerification = vi.fn();
  let jwt: JwtService;

  beforeEach(() => {
    process.env.SESSION_SECRET = 'test-session-secret';
    process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:4000/api/auth/google/callback';
    jwt = new JwtService({ secret: 'test-session-secret' });
    issueVerification.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const build = (rows: Row[] = []) => {
    const { rows: store, prisma } = fakePrisma(rows);
    const auth = { issueVerification } as unknown as AuthService;
    return { store, service: new GoogleService(prisma, jwt, auth) };
  };

  /** Google's token endpoint, answering with whatever claims the test wants. */
  const stubToken = (claims: Record<string, unknown> | null) =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        claims
          ? new Response(JSON.stringify({ id_token: idToken(claims) }), { status: 200 })
          : new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 }),
      ),
    );

  /** Walks the real start() so the state cookie and the nonce match, as the browser would. */
  const signIn = async (
    service: GoogleService,
    claims: Record<string, unknown> | ((nonce: string) => Record<string, unknown>) = {},
  ) => {
    const { url, stateToken } = await service.start('vi');
    const params = new URL(url).searchParams;
    const nonce = params.get('nonce')!;
    const extra = typeof claims === 'function' ? claims(nonce) : { nonce, ...claims };
    stubToken(baseClaims(extra));
    return service.finish('auth-code', params.get('state')!, stateToken);
  };

  it('is off until both credentials are set', () => {
    const { service } = build();
    expect(service.configured).toBe(true);
    process.env.GOOGLE_CLIENT_SECRET = '';
    expect(service.configured).toBe(false);
  });

  it('creates a verified account and keeps the locale the user signed in with', async () => {
    const { store, service } = build();
    const result = await signIn(service);
    expect(result).toMatchObject({ emailVerified: true, locale: 'vi' });
    expect(store[0]).toMatchObject({
      email: 'someone@example.com', // normalised
      googleId: 'google-sub-1',
      name: 'Someone',
    });
    // Google vouched for the address, so no confirmation mail of our own.
    expect(issueVerification).not.toHaveBeenCalled();
  });

  it('signs an existing Google account back in without creating a second one', async () => {
    const { store, service } = build([
      {
        id: 'u1',
        email: 'someone@example.com',
        googleId: 'google-sub-1',
        name: 'Someone',
        role: 'user',
        emailVerifiedAt: new Date(),
      },
    ]);
    const result = await signIn(service);
    expect(result.userId).toBe('u1');
    expect(store).toHaveLength(1);
  });

  it('links Google onto an account that already has a password', async () => {
    const { store, service } = build([
      {
        id: 'u1',
        email: 'someone@example.com',
        googleId: null,
        name: null,
        role: 'user',
        emailVerifiedAt: null,
      },
    ]);
    const result = await signIn(service);
    expect(result.userId).toBe('u1');
    expect(store).toHaveLength(1);
    expect(store[0].googleId).toBe('google-sub-1');
    expect(store[0].emailVerifiedAt).not.toBeNull();
  });

  it('sends our own confirmation mail when Google has not verified the address', async () => {
    const { store, service } = build();
    const result = await signIn(service, { email_verified: false });
    expect(result.emailVerified).toBe(false);
    expect(store[0].emailVerifiedAt).toBeNull();
    expect(issueVerification).toHaveBeenCalledWith('u1', 'someone@example.com', 'vi');
  });

  it('refuses to hand over an existing account on an address Google has not verified', async () => {
    const { service } = build([
      {
        id: 'u1',
        email: 'someone@example.com',
        googleId: null,
        name: null,
        role: 'user',
        emailVerifiedAt: new Date(),
      },
    ]);
    await expect(signIn(service, { email_verified: false })).rejects.toThrow();
  });

  it('rejects a state that does not match the cookie', async () => {
    const { service } = build();
    const { stateToken } = await service.start('en');
    stubToken(baseClaims());
    await expect(service.finish('auth-code', 'not-the-state', stateToken)).rejects.toThrow();
  });

  it('rejects a missing state cookie', async () => {
    const { service } = build();
    const { url } = await service.start('en');
    stubToken(baseClaims());
    const state = new URL(url).searchParams.get('state')!;
    await expect(service.finish('auth-code', state, undefined)).rejects.toThrow();
  });

  it('rejects an id_token meant for another client, another issuer, or already expired', async () => {
    for (const over of [
      { aud: 'someone-elses-client' },
      { iss: 'https://evil.example' },
      { exp: Math.floor(Date.now() / 1000) - 10 },
    ]) {
      const { service } = build();
      await expect(signIn(service, over)).rejects.toThrow();
    }
  });

  it('rejects a replayed id_token carrying someone else’s nonce', async () => {
    const { service } = build();
    await expect(signIn(service, () => ({ nonce: 'a-different-nonce' }))).rejects.toThrow();
  });

  it('rejects a failed code exchange', async () => {
    const { service } = build();
    const { url, stateToken } = await service.start('en');
    stubToken(null);
    const state = new URL(url).searchParams.get('state')!;
    await expect(service.finish('auth-code', state, stateToken)).rejects.toThrow();
  });
});
