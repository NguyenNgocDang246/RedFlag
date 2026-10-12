import { randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Locale, User } from '@prisma/client';
import { DEFAULT_LOCALE, isSupportedLocale, parseAdminEmails } from '@redflag/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';
import { derivedSecret } from './token-secret';

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = process.env.GOOGLE_TOKEN_URL ?? 'https://oauth2.googleapis.com/token';
const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];
const STATE_TTL = '10m';

/** Carries the state/nonce across the trip to Google; path-scoped to /api/auth like the refresh cookie. */
export const OAUTH_STATE_COOKIE = 'rf_oauth';

interface StateClaims {
  state: string;
  nonce: string;
  locale: Locale;
  next?: string;
}

export interface GoogleSignIn {
  userId: string;
  /** false only when Google itself has not verified the address — then the user must confirm it. */
  emailVerified: boolean;
  locale: Locale;
  next?: string;
}

/** The id_token claims we use. */
interface IdTokenClaims {
  sub?: string;
  aud?: string;
  iss?: string;
  exp?: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
}

function decodeIdToken(idToken: string): IdTokenClaims | null {
  const parts = idToken.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as IdTokenClaims;
  } catch {
    return null;
  }
}

/**
 * Google sign-in, hand-rolled on the authorization-code flow (two routes and one fetch — a passport
 * strategy would be more moving parts than the thing it replaces, and JwtAuthGuard already verifies
 * its own tokens).
 *
 * The id_token comes straight back from Google's token endpoint over TLS, in exchange for our client
 * secret, so its claims are checked (aud / iss / exp / nonce) but its signature needs no JWKS trip.
 */
@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly auth: AuthService,
  ) {}

  private get clientId(): string {
    return process.env.GOOGLE_CLIENT_ID?.trim() ?? '';
  }

  private get clientSecret(): string {
    return process.env.GOOGLE_CLIENT_SECRET?.trim() ?? '';
  }

  private get redirectUri(): string {
    const api = (process.env.API_PUBLIC_URL ?? 'http://localhost:4000').replace(/\/+$/, '');
    return process.env.GOOGLE_REDIRECT_URI?.trim() || `${api}/api/auth/google/callback`;
  }

  /** No credentials configured → the routes 404 and the web hides the button. */
  get configured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  /** Where to send the browser, plus the state token to put in the cookie. */
  async start(localeInput?: string, next?: string): Promise<{ url: string; stateToken: string }> {
    const locale: Locale =
      localeInput && isSupportedLocale(localeInput) ? (localeInput as Locale) : DEFAULT_LOCALE;
    const state = randomBytes(16).toString('hex');
    const nonce = randomBytes(16).toString('hex');
    const stateToken = await this.jwt.signAsync(
      { state, nonce, locale, ...(next ? { next } : {}) },
      { secret: derivedSecret('oauth-state'), expiresIn: STATE_TTL },
    );

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      nonce,
      // Let people pick the account instead of silently reusing whoever is signed in on the device.
      prompt: 'select_account',
    });
    return { url: `${AUTH_ENDPOINT}?${params.toString()}`, stateToken };
  }

  /** Validates the round trip, then links or creates the account. Throws if anything is off. */
  async finish(code: string, state: string, stateToken: string | undefined): Promise<GoogleSignIn> {
    const claims = await this.readState(stateToken);
    if (!claims || claims.state !== state) {
      throw new BadRequestException('Google sign-in could not be verified');
    }

    const idToken = await this.exchangeCode(code);
    const profile = this.readIdToken(idToken, claims.nonce);
    const user = await this.resolveUser(profile, claims.locale);

    return {
      userId: user.id,
      emailVerified: Boolean(user.emailVerifiedAt),
      locale: claims.locale,
      next: claims.next,
    };
  }

  private async readState(stateToken: string | undefined): Promise<StateClaims | null> {
    if (!stateToken) return null;
    try {
      return await this.jwt.verifyAsync<StateClaims>(stateToken, {
        secret: derivedSecret('oauth-state'),
      });
    } catch {
      return null;
    }
  }

  private async exchangeCode(code: string): Promise<string> {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });
    const data = (await res.json().catch(() => ({}))) as { id_token?: string; error?: string };
    if (!res.ok || !data.id_token) {
      this.logger.error(`Google token exchange failed (${res.status}): ${data.error ?? ''}`);
      throw new BadRequestException('Google sign-in failed');
    }
    return data.id_token;
  }

  private readIdToken(
    idToken: string,
    nonce: string,
  ): { sub: string; email: string; emailVerified: boolean; name?: string } {
    const claims = decodeIdToken(idToken);
    const nowSec = Math.floor(Date.now() / 1000);
    const ok =
      claims &&
      claims.sub &&
      claims.email &&
      claims.aud === this.clientId &&
      claims.iss &&
      ISSUERS.includes(claims.iss) &&
      typeof claims.exp === 'number' &&
      claims.exp > nowSec &&
      claims.nonce === nonce;
    if (!ok) throw new BadRequestException('Google sign-in could not be verified');

    return {
      sub: claims.sub as string,
      email: (claims.email as string).trim().toLowerCase(),
      emailVerified: claims.email_verified === true || claims.email_verified === 'true',
      name: claims.name?.trim() || undefined,
    };
  }

  /** Match on the Google id first, then on the address; otherwise this is a new account. */
  private async resolveUser(
    profile: { sub: string; email: string; emailVerified: boolean; name?: string },
    locale: Locale,
  ): Promise<User> {
    const byGoogle = await this.prisma.user.findUnique({ where: { googleId: profile.sub } });
    if (byGoogle) return this.promoteAdmin(byGoogle);

    const byEmail = await this.prisma.user.findUnique({ where: { email: profile.email } });
    if (byEmail) {
      // Linking hands over an existing account, so only do it on an address Google vouches for.
      if (!profile.emailVerified) {
        throw new BadRequestException('Google has not verified this email address');
      }
      const linked = await this.prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleId: profile.sub,
          name: byEmail.name ?? profile.name ?? null,
          emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(),
        },
      });
      return this.promoteAdmin(linked);
    }

    const created = await this.prisma.user.create({
      data: {
        email: profile.email,
        googleId: profile.sub,
        name: profile.name ?? null,
        locale,
        // Google's own verification stands in for ours (R1 still holds: the address is confirmed).
        emailVerifiedAt: profile.emailVerified ? new Date() : null,
        consents: { create: { type: 'terms' } },
      },
    });
    if (!profile.emailVerified) {
      await this.auth.issueVerification(created.id, created.email, locale);
    }
    return this.promoteAdmin(created);
  }

  /** Same rule as a password sign-in: ADMIN_EMAILS decides, there is no UI to grant it. */
  private async promoteAdmin(user: User): Promise<User> {
    if (user.role === 'admin') return user;
    if (!parseAdminEmails(process.env.ADMIN_EMAILS).includes(user.email)) return user;
    return this.prisma.user.update({ where: { id: user.id }, data: { role: 'admin' } });
  }
}
