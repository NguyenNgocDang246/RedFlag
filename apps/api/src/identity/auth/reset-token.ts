import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { derivedSecret } from './token-secret';

const RESET_TTL = '1h';
const PURPOSE = 'reset';

interface ResetClaims {
  sub: string;
  /** Fingerprint of the password hash the token was issued against. */
  pwh: string;
  purpose: string;
}

/** Ties a token to the password it was issued against (see ResetTokenService). */
export function passwordFingerprint(passwordHash: string): string {
  return createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);
}

/**
 * Password-reset links, with no row in the database.
 *
 * Single use comes from the fingerprint: it covers the password hash at the time the link was
 * mailed, so the moment a reset (or any other password change) goes through, that link — and every
 * other one still outstanding — stops verifying. Rate limiting lives in the throttler, not here.
 */
@Injectable()
export class ResetTokenService {
  constructor(private readonly jwt: JwtService) {}

  sign(userId: string, passwordHash: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId, pwh: passwordFingerprint(passwordHash), purpose: PURPOSE },
      { secret: derivedSecret('password-reset'), expiresIn: RESET_TTL },
    );
  }

  /** null for anything off: bad signature, wrong purpose, expired, malformed. */
  async verify(token: string): Promise<{ userId: string; pwh: string } | null> {
    try {
      const claims = await this.jwt.verifyAsync<ResetClaims>(token, {
        secret: derivedSecret('password-reset'),
      });
      if (claims.purpose !== PURPOSE || !claims.sub || !claims.pwh) return null;
      return { userId: claims.sub, pwh: claims.pwh };
    } catch {
      return null;
    }
  }
}
