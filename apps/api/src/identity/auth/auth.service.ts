import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Locale } from '@prisma/client';
import { DEFAULT_LOCALE, isSupportedLocale, parseAdminEmails } from '@redflag/shared';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { ACCESS_TTL_SEC } from './jwt-auth.guard';

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  async register(email: string, password: string, localeInput?: string): Promise<{ ok: true }> {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw new ConflictException('Email đã được đăng ký / Email already registered');
    }

    const locale: Locale =
      localeInput && isSupportedLocale(localeInput) ? (localeInput as Locale) : DEFAULT_LOCALE;
    const passwordHash = await bcrypt.hash(password, 10);

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

  private async issueVerification(userId: string, email: string, locale: Locale): Promise<void> {
    const token = randomBytes(32).toString('hex');
    await this.prisma.emailVerification.create({
      data: { userId, token, expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS) },
    });

    const webUrl = process.env.WEB_PUBLIC_URL ?? 'http://localhost:4001';
    const link = `${webUrl}/verify?token=${token}&locale=${locale}`;
    await this.mail.send(
      email,
      'Xác thực email RedFlag / Verify your RedFlag email',
      `<p>Chào mừng tới RedFlag!</p>
       <p>Nhấn vào liên kết để xác thực email (hết hạn sau 24 giờ):</p>
       <p><a href="${link}">${link}</a></p>`,
    );
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
      role: user.role,
      training: { interests: user.trainingPrefs?.interests ?? [] },
      test: {
        enabled: user.testOptin?.enabled ?? false,
        frequency: user.testOptin?.frequency ?? 'off',
      },
    };
  }
}
