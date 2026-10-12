import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it } from 'vitest';
import { passwordFingerprint, ResetTokenService } from './reset-token';
import { derivedSecret } from './token-secret';

const SESSION_SECRET = 'test-session-secret';

describe('ResetTokenService', () => {
  let jwt: JwtService;
  let tokens: ResetTokenService;

  beforeEach(() => {
    process.env.SESSION_SECRET = SESSION_SECRET;
    // Same shape as the JwtModule in identity.module.ts: the session secret is the default.
    jwt = new JwtService({ secret: SESSION_SECRET });
    tokens = new ResetTokenService(jwt);
  });

  it('round-trips the user and the password fingerprint', async () => {
    const token = await tokens.sign('u1', 'hash-one');
    expect(await tokens.verify(token)).toEqual({
      userId: 'u1',
      pwh: passwordFingerprint('hash-one'),
    });
  });

  it('moves the fingerprint when the password changes, which is what makes a link single-use', () => {
    expect(passwordFingerprint('hash-one')).not.toBe(passwordFingerprint('hash-two'));
  });

  it('rejects a token signed with the session secret', async () => {
    const forged = await jwt.signAsync({ sub: 'u1', pwh: 'x', purpose: 'reset' });
    expect(await tokens.verify(forged)).toBeNull();
  });

  it('cannot be used as an access token', async () => {
    const token = await tokens.sign('u1', 'hash-one');
    // What JwtAuthGuard does: verify with the session secret. It must not accept this token.
    expect(() => jwt.verify(token)).toThrow();
  });

  it('rejects an expired token', async () => {
    const expired = await jwt.signAsync(
      { sub: 'u1', pwh: passwordFingerprint('hash-one'), purpose: 'reset' },
      { secret: derivedSecret('password-reset'), expiresIn: '-1s' },
    );
    expect(await tokens.verify(expired)).toBeNull();
  });

  it('rejects a token issued for another purpose', async () => {
    const other = await jwt.signAsync(
      { sub: 'u1', pwh: 'x', purpose: 'oauth-state' },
      { secret: derivedSecret('password-reset') },
    );
    expect(await tokens.verify(other)).toBeNull();
  });
});
