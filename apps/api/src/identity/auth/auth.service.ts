import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Locale } from '@prisma/client';
import { DEFAULT_LOCALE, isSupportedLocale, parseAdminEmails } from '@redflag/shared';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { renderAccountMail, type AccountMailKind } from '../../mail/account-mail';
import { saveInterests } from '../training-prefs';
import { ACCESS_TTL_SEC } from './jwt-auth.guard';
import { passwordFingerprint, ResetTokenService } from './reset-token';

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const BCRYPT_COST = 10;

/** Web base URL without a trailing slash (links in mail point here). */
function webUrl(): string {
  return (process.env.WEB_PUBLIC_URL ?? 'http://localhost:4001').replace(/\/+$/, '');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly resetTokens: ResetTokenService,
  ) {}

  async register(email: string, password: string, localeInput?: string): Promise<{ ok: true }> {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw new ConflictException('Email đã được đăng ký / Email already registered');
    }

    const locale: Locale =
      localeInput && isSupportedLocale(localeInput) ? (localeInput as Locale) : DEFAULT_LOCALE;
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        locale,
        consents: { create: { type: 'terms' } },
      },
    });

    await this.issueVerification(user.id, user.email, user.locale);
    return { ok: true };
  }

  /** The language of the page they are on if we have it, otherwise the one on the account. */
  private pickLocale(input: string | undefined, fallback: Locale): Locale {
    return input && isSupportedLocale(input) ? (input as Locale) : fallback;
  }

  private async sendAccountMail(
    to: string,
    kind: AccountMailKind,
    locale: Locale,
    link: string,
  ): Promise<void> {
    const mail = renderAccountMail(kind, locale, { link });
    await this.mail.send(to, mail.subject, mail.html, mail.text);
  }

  /**
   * Mails a fresh confirmation link and kills any older one, so only the newest works.
   * Public because Google sign-in needs it when Google itself has not verified the address.
   */
  async issueVerification(userId: string, email: string, locale: Locale): Promise<void> {
    const token = randomBytes(32).toString('hex');
    await this.prisma.$transaction([
      this.prisma.emailVerification.updateMany({
        where: { userId, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      this.prisma.emailVerification.create({
        data: { userId, token, expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS) },
      }),
    ]);

    await this.sendAccountMail(
      email,
      'verify',
      locale,
      `${webUrl()}/verify?token=${token}&locale=${locale}`,
    );
  }

  /**
   * A new confirmation link for someone whose old one expired — without this, an unverified
   * account is locked out for good (login refuses it, register reports the email as taken).
   * Always answers the same way: an unknown or already-verified address reveals nothing.
   */
  async resendVerification(email: string, localeInput?: string): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (user && !user.emailVerifiedAt) {
      const locale = this.pickLocale(localeInput, user.locale);
      try {
        await this.issueVerification(user.id, user.email, locale);
      } catch (err) {
        this.logger.error(`Could not resend the verification mail: ${String(err)}`);
      }
    }
    return { ok: true };
  }

  async verifyEmail(token: string): Promise<{ ok: true }> {
    const record = await this.prisma.emailVerification.findUnique({ where: { token } });
    if (!record || record.consumedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Liên kết không hợp lệ hoặc đã hết hạn / Invalid or expired link');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerification.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
    ]);
    return { ok: true };
  }

  /**
   * Mails a reset link. Answers `{ ok: true }` for every address, known or not, so the response
   * cannot be used to find out who has an account here.
   */
  async requestPasswordReset(email: string, localeInput?: string): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) return { ok: true };
    const locale = this.pickLocale(localeInput, user.locale);

    try {
      if (!user.passwordHash) {
        // Signs in with Google and has no password to reset — point at the button that works.
        await this.sendAccountMail(
          user.email,
          'googleAccount',
          locale,
          `${webUrl()}/login?locale=${locale}`,
        );
      } else {
        const token = await this.resetTokens.sign(user.id, user.passwordHash);
        await this.sendAccountMail(
          user.email,
          'reset',
          locale,
          `${webUrl()}/reset-password?token=${encodeURIComponent(token)}&locale=${locale}`,
        );
      }
    } catch (err) {
      this.logger.error(`Could not send the password reset mail: ${String(err)}`);
    }
    return { ok: true };
  }

  /**
   * Sets a new password from a mailed link. Returns the user id so the caller can sign every
   * device out. Expired, already-used and forged tokens all get one message — nothing to probe.
   *
   * `emailVerifiedAt` is deliberately left alone: only the verify flow confirms an address.
   */
  async resetPassword(token: string, password: string): Promise<string> {
    const invalid = () =>
      new BadRequestException('Liên kết không hợp lệ hoặc đã hết hạn / Invalid or expired link');

    const claims = await this.resetTokens.verify(token);
    if (!claims) throw invalid();

    const user = await this.prisma.user.findUnique({ where: { id: claims.userId } });
    // A changed password moves the fingerprint, which is what makes the link single-use.
    if (!user?.passwordHash || passwordFingerprint(user.passwordHash) !== claims.pwh) {
      throw invalid();
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(password, BCRYPT_COST) },
    });
    await this.notifyPasswordChanged(user.email, user.locale);
    return user.id;
  }

  /** A password change is worth knowing about even when it was you. Never fails the request. */
  private async notifyPasswordChanged(email: string, locale: Locale): Promise<void> {
    try {
      await this.sendAccountMail(
        email,
        'passwordChanged',
        locale,
        `${webUrl()}/forgot-password?locale=${locale}`,
      );
    } catch (err) {
      this.logger.error(`Could not send the password-changed notice: ${String(err)}`);
    }
  }

  /** Checks email+password and requires a verified email (R1). Returns userId. */
  async validateAndLogin(email: string, password: string): Promise<string> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng / Invalid credentials');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng / Invalid credentials');
    }
    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException('Vui lòng xác thực email trước / Please verify your email first');
    }
    // Admin role comes from ADMIN_EMAILS env — promoted on sign-in (there's no UI to grant it).
    if (user.role !== 'admin' && parseAdminEmails(process.env.ADMIN_EMAILS).includes(user.email)) {
      await this.prisma.user.update({ where: { id: user.id }, data: { role: 'admin' } });
    }
    return user.id;
  }

  /** Updates personal info. Blank text clears the field; services are trimmed and de-duplicated. */
  async updateProfile(
    userId: string,
    dto: {
      name?: string;
      occupation?: string;
      servicesUsed?: string[];
      locale?: string;
      interests?: string[];
    },
  ) {
    const text = (v: string | undefined) => (v === undefined ? undefined : v.trim() || null);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: text(dto.name),
        occupation: text(dto.occupation),
        servicesUsed: dto.servicesUsed
          ? [...new Set(dto.servicesUsed.map((x) => x.trim()).filter(Boolean))]
          : undefined,
        locale: dto.locale && isSupportedLocale(dto.locale) ? (dto.locale as Locale) : undefined,
      },
    });
    if (dto.interests) await saveInterests(this.prisma, userId, dto.interests);
    return this.me(userId);
  }

  /**
   * Changes the password after checking the current one. The caller signs out the other devices.
   * An account that only signs in with Google has none to check: being signed in is the proof.
   */
  async changePassword(
    userId: string,
    currentPassword: string | undefined,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (user.passwordHash) {
      const ok = currentPassword ? await bcrypt.compare(currentPassword, user.passwordHash) : false;
      if (!ok) {
        throw new BadRequestException('Mật khẩu hiện tại không đúng / Current password is incorrect');
      }
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_COST) },
    });
    await this.notifyPasswordChanged(user.email, user.locale);
  }

  /** Short-lived JWT access token (the guard verifies it without touching the DB). */
  signAccessToken(userId: string): string {
    return this.jwt.sign({ sub: userId }, { expiresIn: ACCESS_TTL_SEC });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { trainingPrefs: true, testOptin: true },
    });
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      occupation: user.occupation,
      servicesUsed: user.servicesUsed,
      locale: user.locale,
      emailVerified: Boolean(user.emailVerifiedAt),
      // So the account page can tell "change password" from "set one", and name the sign-in methods.
      hasPassword: Boolean(user.passwordHash),
      google: Boolean(user.googleId),
      role: user.role,
      training: { interests: user.trainingPrefs?.interests ?? [] },
      test: {
        enabled: user.testOptin?.enabled ?? false,
        frequency: user.testOptin?.frequency ?? 'off',
      },
    };
  }
}
