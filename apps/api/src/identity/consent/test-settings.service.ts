import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Locale, TestFrequency, TestStopReason } from '@prisma/client';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CONFIRMATION_TEXT_VERSION, confirmationMatches, expectedPhrase } from '../confirmation';

/** A time zone the runtime knows (IANA name); anything else is dropped. */
export function validTimeZone(tz: string | undefined): string | undefined {
  if (!tz) return undefined;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return undefined;
  }
}

/** on = tests are sent; paused = consent kept, nothing sent; off = never enabled or unsubscribed. */
export type TestState = 'on' | 'paused' | 'off';

/**
 * Test flow management after onboarding (R1): pause, resume, unsubscribe.
 * Pause = keep config but stop scheduling; Unsubscribe = disable + revoke consent.
 */
@Injectable()
export class TestSettingsService {
  private readonly logger = new Logger(TestSettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  private async requireOptin(userId: string) {
    const optin = await this.prisma.userTestOptin.findUnique({ where: { userId } });
    if (!optin) {
      throw new BadRequestException(
        'Chưa bật Test flow trong onboarding / Test flow not enabled yet',
      );
    }
    return optin;
  }

  async status(userId: string) {
    const [optin, consent] = await Promise.all([
      this.prisma.userTestOptin.findUnique({ where: { userId } }),
      this.prisma.consent.findFirst({ where: { userId, type: 'test_flow', revokedAt: null } }),
    ]);
    const state: TestState = optin?.enabled ? 'on' : consent && optin ? 'paused' : 'off';
    return {
      state,
      frequency: optin && optin.frequency !== TestFrequency.off ? optin.frequency : null,
      // Only meaningful while tests are not on: why the system switched them off.
      stoppedReason: state === 'on' ? null : (optin?.stoppedReason ?? null),
    };
  }

  /**
   * Turns tests on (R1): requires the confirmation phrase retyped exactly (type-to-confirm), and
   * records a consent with the warning text version + locale. Used by onboarding and the /me page.
   */
  async enable(
    userId: string,
    locale: Locale,
    confirmationText: string | undefined,
    frequency?: TestFrequency,
    timezone?: string,
  ) {
    if (!confirmationMatches(confirmationText, locale)) {
      throw new BadRequestException({
        message: 'Câu xác nhận chưa đúng / Confirmation phrase does not match',
        expectedPhrase: expectedPhrase(locale),
        locale,
      });
    }
    const freq = frequency && frequency !== TestFrequency.off ? frequency : TestFrequency.medium;
    const tz = validTimeZone(timezone);
    await this.prisma.$transaction([
      this.prisma.userTestOptin.upsert({
        where: { userId },
        create: { userId, enabled: true, frequency: freq, timezone: tz },
        update: { enabled: true, frequency: freq, stoppedReason: null, ...(tz ? { timezone: tz } : {}) },
      }),
      this.prisma.consent.create({
        data: { userId, type: 'test_flow', textVersion: CONFIRMATION_TEXT_VERSION, locale, confirmationText },
      }),
    ]);
    return { enabled: true, frequency: freq };
  }

  /** Changes how often tests arrive (keeps on/paused as is). */
  async setFrequency(userId: string, frequency: TestFrequency) {
    if (frequency === TestFrequency.off) throw new BadRequestException('Use pause or unsubscribe instead');
    await this.requireOptin(userId);
    // The pending test was timed for the old frequency — the scheduler plans a new one.
    await this.prisma.$transaction([
      this.prisma.userTestOptin.update({ where: { userId }, data: { frequency } }),
      this.cancelPending(userId),
    ]);
    await this.recallHandedOff(userId);
    return this.status(userId);
  }

  async pause(userId: string) {
    await this.requireOptin(userId);
    await this.prisma.$transaction([
      this.prisma.userTestOptin.update({ where: { userId }, data: { enabled: false } }),
      this.cancelPending(userId),
    ]);
    await this.recallHandedOff(userId);
    return { enabled: false, paused: true };
  }

  async resume(userId: string) {
    const optin = await this.requireOptin(userId);
    // Resume only if the test_flow consent hasn't been revoked.
    const activeConsent = await this.prisma.consent.findFirst({
      where: { userId, type: 'test_flow', revokedAt: null },
    });
    if (!activeConsent) {
      throw new BadRequestException(
        'Cần xác nhận lại trong onboarding / Please re-confirm in onboarding',
      );
    }
    const frequency = optin.frequency === TestFrequency.off ? TestFrequency.medium : optin.frequency;
    await this.prisma.userTestOptin.update({
      where: { userId },
      data: { enabled: true, frequency, stoppedReason: null },
    });
    return { enabled: true, frequency };
  }

  async unsubscribe(userId: string) {
    await this.requireOptin(userId);
    await this.prisma.$transaction([
      this.prisma.userTestOptin.update({
        where: { userId },
        data: { enabled: false, frequency: TestFrequency.off },
      }),
      this.prisma.consent.updateMany({
        where: { userId, type: 'test_flow', revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.cancelPending(userId),
    ]);
    await this.recallHandedOff(userId);
    return { enabled: false, unsubscribed: true };
  }

  /**
   * Switches tests off because of the mail provider, not the user (R1):
   * - `complained` (they marked a test as spam) = unsubscribe: consent revoked, a fresh opt-in needed.
   * - `bounced` (the address cannot receive mail) = pause: consent kept, they can resume.
   * The reason is kept so the settings page can say why.
   */
  async stopBySystem(userId: string, reason: TestStopReason) {
    const optin = await this.prisma.userTestOptin.findUnique({ where: { userId } });
    if (!optin) return;
    await this.prisma.$transaction([
      this.prisma.userTestOptin.update({
        where: { userId },
        data:
          reason === TestStopReason.complained
            ? { enabled: false, frequency: TestFrequency.off, stoppedReason: reason }
            : { enabled: false, stoppedReason: reason },
      }),
      ...(reason === TestStopReason.complained
        ? [
            this.prisma.consent.updateMany({
              where: { userId, type: 'test_flow', revokedAt: null },
              data: { revokedAt: new Date() },
            }),
          ]
        : []),
      this.cancelPending(userId),
    ]);
    await this.recallHandedOff(userId);
    this.logger.log(`Tests stopped for a user: ${reason}`);
  }

  /** Tests planned but not sent yet are dropped right away (R1) — the worker also re-checks before sending. */
  private cancelPending(userId: string) {
    return this.prisma.campaign.updateMany({
      where: { userId, status: 'scheduled', isTest: false },
      data: { status: 'cancelled' },
    });
  }

  /**
   * The daily cron hands tests to the mail provider up to a day before they land. Those are already
   * `sent` (with `sentAt` in the future), so cancelPending misses them — call them back here so a
   * pause or unsubscribe still stops everything (R1).
   */
  private async recallHandedOff(userId: string) {
    const waiting = await this.prisma.campaign.findMany({
      where: { userId, status: 'sent', isTest: false, sentAt: { gt: new Date() } },
      select: { id: true, delivery: { select: { providerMessageId: true } } },
    });
    for (const campaign of waiting) {
      const messageId = campaign.delivery?.providerMessageId;
      if (!messageId) continue;
      try {
        await this.mail.cancelScheduled(messageId);
      } catch (e) {
        // Most likely it went out in the meantime; nothing left to call back.
        this.logger.warn(`Could not recall campaign ${campaign.id}: ${String(e)}`);
        continue;
      }
      await this.prisma.$transaction([
        this.prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'cancelled' } }),
        this.prisma.delivery.update({ where: { campaignId: campaign.id }, data: { status: 'failed' } }),
      ]);
    }
  }
}
