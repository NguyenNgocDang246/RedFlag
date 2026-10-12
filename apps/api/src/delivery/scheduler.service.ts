import { Injectable, Logger } from '@nestjs/common';
import { Locale, TestFrequency } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryConfig } from './delivery.config';
import { nextSendAt } from './send-window';

/** How many users one planning pass looks at. */
const BATCH = 200;

/**
 * Plans the next simulated test for each user who is due one (R8).
 *
 * Only ever plans for someone whose consent is currently active, and only one pending test at a
 * time — so pausing or unsubscribing (which cancels the pending one) stops everything immediately.
 * Idempotent: a user who already has a pending test is skipped, so running a pass twice is harmless.
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: DeliveryConfig,
  ) {}

  async planDue(now = new Date()): Promise<number> {
    const candidates = await this.prisma.userTestOptin.findMany({
      where: {
        enabled: true,
        frequency: { not: TestFrequency.off },
        // Verified address only (R1), and consent not revoked.
        user: {
          emailVerifiedAt: { not: null },
          consents: { some: { type: 'test_flow', revokedAt: null } },
          // One pending test at a time.
          campaigns: { none: { status: 'scheduled', isTest: false } },
        },
      },
      take: BATCH,
      include: { user: { select: { id: true, locale: true } } },
    });

    let planned = 0;
    for (const optin of candidates) {
      const scheduled = await this.planFor(optin.user.id, optin.user.locale, optin.frequency, optin.timezone, now);
      if (scheduled) planned++;
    }
    if (planned) this.logger.log(`Planned ${planned} test email(s)`);
    return planned;
  }

  /** Plans one user's next test. Returns null when there is no publishable content for their language. */
  async planFor(
    userId: string,
    locale: Locale,
    frequency: TestFrequency,
    timezone: string | null,
    now = new Date(),
  ) {
    if (frequency === TestFrequency.off) return null;

    const variantId = await this.pickVariant(userId, locale);
    if (!variantId) {
      this.logger.warn(`No published test email available in "${locale}" — skipping user`);
      return null;
    }

    const lastSent = await this.prisma.campaign.findFirst({
      where: { userId, status: 'sent', isTest: false },
      orderBy: { sentAt: 'desc' },
      select: { sentAt: true },
    });

    const scheduledAt = nextSendAt({
      // Never counted from "now" when a test already went out, so pausing and resuming can't be used
      // to pull the next one forward.
      from: lastSent?.sentAt ?? now,
      frequency,
      timeZone: timezone,
      window: this.config.sendWindow,
    });

    return this.prisma.campaign.create({
      data: { userId, variantId, locale, scheduledAt },
      select: { id: true, scheduledAt: true },
    });
  }

  /**
   * Picks what to send: a published variant with content in the user's language, preferring ones
   * they have not had before, then the least recently used.
   */
  private async pickVariant(userId: string, locale: Locale): Promise<string | null> {
    const available = await this.prisma.variant.findMany({
      where: {
        template: { status: 'published' },
        translations: { some: { locale } },
      },
      select: { id: true },
    });
    if (available.length === 0) return null;

    const seen = await this.prisma.campaign.findMany({
      where: { userId, variantId: { in: available.map((v) => v.id) } },
      orderBy: { createdAt: 'desc' },
      select: { variantId: true },
    });
    const seenIds = new Set(seen.map((c) => c.variantId));

    const unseen = available.filter((v) => !seenIds.has(v.id));
    const pool = unseen.length > 0 ? unseen : available.filter((v) => v.id !== seen[0]?.variantId);
    const from = pool.length > 0 ? pool : available;
    return from[Math.floor(Math.random() * from.length)].id;
  }
}
