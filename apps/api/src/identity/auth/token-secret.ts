import { createHmac } from 'node:crypto';

/**
 * A per-purpose signing secret derived from SESSION_SECRET.
 *
 * JwtAuthGuard accepts any token that verifies with the session secret and carries a `sub`
 * (see jwt-auth.guard.ts), so a password-reset or OAuth-state token signed with that same secret
 * could be pasted into the access cookie and act as a session. Signing those with a derived secret
 * instead keeps the token families mutually unverifiable.
 */
export function derivedSecret(purpose: string): string {
  // Same dev fallback as the JwtModule factory in identity.module.ts.
  const base = process.env.SESSION_SECRET || 'dev-insecure-secret';
  return createHmac('sha256', base).update(purpose).digest('hex');
}
