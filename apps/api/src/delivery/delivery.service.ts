import { randomBytes } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { Locale, Prisma, TrackingPurpose } from '@prisma/client';
import { DEFAULT_LOCALE, renderSimEmail } from '@redflag/shared';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryConfig } from './delivery.config';

/** How long a campaign's tracking links keep working (R5: tokens expire). */
const TOKEN_TTL_DAYS = 30;

/** A test nobody sent in time (worker down, content withdrawn) is dropped rather than sent late. */
const STALE_AFTER_HOURS = 12;

/** Campaigns handled per pass. */
const BATCH = 50;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The daily run hands Resend every test due before the next run, plus an hour of slack for a cron
 * that fires late. Resend then delivers each one at its planned time.
 */
const HANDOFF_HORIZON_MS = 25 * 60 * 60 * 1000;

/** Anything due sooner than this is just sent now. */
const SCHEDULE_MIN_LEAD_MS = 60 * 1000;

/** Unguessable, carries no user data (R5). */
const newToken = () => randomBytes(24).toString('base64url');

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: DeliveryConfig,
  ) {}

  /** Sends every test that has come due. Safe to run concurrently: each campaign is claimed once. */
  async sendDue(now = new Date()): Promise<number> {
    const due = await this.prisma.campaign.findMany({
      where: { status: 'scheduled', scheduledAt: { lte: now } },
      orderBy: { scheduledAt: 'asc' },
      take: BATCH,
      select: { id: true, scheduledAt: true },
    });

    let sent = 0;
    for (const campaign of due) {
      if (now.getTime() - campaign.scheduledAt.getTime() > STALE_AFTER_HOURS * 60 * 60 * 1000) {
        await this.prisma.campaign.updateMany({
          where: { id: campaign.id, status: 'scheduled' },
          data: { status: 'expired' },
        });
        continue;
      }
      if (await this.sendCampaign(campaign.id)) sent++;
    }
    if (sent) this.logger.log(`Sent ${sent} test email(s)`);
    return sent;
  }

  /**
   * The daily cron's pass (Vercel runs once a day): hands every test due in the next
   * HANDOFF_HORIZON_MS to the mail provider with its delivery time, in batches, until none are left
   * or the time budget runs out (the next run picks up the rest).
   */
  async handOffDue(now = new Date(), budgetMs = 240_000): Promise<number> {
    const started = Date.now();
    const horizon = new Date(now.getTime() + HANDOFF_HORIZON_MS);
    // A campaign that fails to hand off stays `scheduled`; skip it for the rest of this run.
    const tried = new Set<string>();
    let handed = 0;

    while (Date.now() - started < budgetMs) {
      const due = await this.prisma.campaign.findMany({
        where: { status: 'scheduled', scheduledAt: { lte: horizon }, id: { notIn: [...tried] } },
        orderBy: { scheduledAt: 'asc' },
        take: BATCH,
        select: { id: true, scheduledAt: true },
      });
      if (due.length === 0) break;

      for (const campaign of due) {
        tried.add(campaign.id);
        if (now.getTime() - campaign.scheduledAt.getTime() > STALE_AFTER_HOURS * 60 * 60 * 1000) {
          await this.prisma.campaign.updateMany({
            where: { id: campaign.id, status: 'scheduled' },
            data: { status: 'expired' },
          });
          continue;
        }
        const deliverAt =
          campaign.scheduledAt.getTime() - now.getTime() > SCHEDULE_MIN_LEAD_MS ? campaign.scheduledAt : undefined;
        if (await this.sendCampaign(campaign.id, { deliverAt })) handed++;
      }
    }
    if (handed) this.logger.log(`Handed ${handed} test email(s) to the mail provider`);
    return handed;
  }

  /**
   * Sends one campaign. Returns false when it was skipped — already claimed by another pass, or
   * consent is no longer in place.
   *
   * With `deliverAt`, the provider holds the message until then; `sentAt` records that time, so the
   * scheduler spaces the next test from when this one actually lands. Pausing or unsubscribing in
   * the meantime calls it back (TestSettingsService).
   */
  async sendCampaign(campaignId: string, opts: { deliverAt?: Date } = {}): Promise<boolean> {
    // Claim first: Delivery.campaignId is unique, so exactly one caller gets past this line and a
    // crash mid-send can never turn into a second email (R8).
    try {
      await this.prisma.delivery.create({ data: { campaignId, status: 'queued' } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return false;
      throw e;
    }

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            emailVerifiedAt: true,
            testOptin: true,
            consents: { where: { type: 'test_flow', revokedAt: null }, select: { id: true } },
          },
        },
        variant: { include: { translations: true } },
      },
    });

    if (!campaign || campaign.status !== 'scheduled') {
      await this.failDelivery(campaignId, 'campaign is not scheduled');
      return false;
    }

    // Consent is re-checked HERE, not just when the campaign was planned: someone who paused or
    // unsubscribed in the meantime must not receive this (R1).
    // An admin preview is its own consent — they asked for this one email, to their own address,
    // just now — so it needs a verified address but not an opt-in to surprise tests.
    const { user } = campaign;
    const consented = campaign.isTest
      ? Boolean(user.emailVerifiedAt)
      : Boolean(user.emailVerifiedAt) && user.consents.length > 0 && Boolean(user.testOptin?.enabled);
    if (!consented) {
      await this.prisma.$transaction([
        this.prisma.campaign.updateMany({
          where: { id: campaignId, status: 'scheduled' },
          data: { status: 'cancelled' },
        }),
        this.prisma.delivery.update({ where: { campaignId }, data: { status: 'failed' } }),
      ]);
      this.logger.log(`Skipped campaign ${campaignId}: consent no longer active`);
      return false;
    }

    const content = this.pickTranslation(campaign.variant.translations, campaign.locale);
    if (!content) {
      await this.failDelivery(campaignId, 'variant has no content for this language');
      return false;
    }

    const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * DAY_MS);
    const clickToken = newToken();
    const openToken = newToken();
    await this.prisma.trackingToken.createMany({
      data: [
        { token: clickToken, campaignId, purpose: TrackingPurpose.click, expiresAt },
        { token: openToken, campaignId, purpose: TrackingPurpose.open, expiresAt },
      ],
    });

    const mail = renderSimEmail({
      locale: campaign.locale as 'en' | 'vi',
      subject: content.subject,
      body: content.body,
      name: user.name,
      linkUrl: this.config.clickUrl(clickToken),
      openPixelUrl: this.config.openPixelUrl(openToken),
    });

    try {
      const messageId = await this.mail.sendSimulation({
        // Always the user's own address — this path cannot send anywhere else.
        to: user.email,
        senderName: content.senderName,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        // One campaign = one email, even if a retry re-sends it after a network hiccup.
        idempotencyKey: campaignId,
        scheduledAt: opts.deliverAt,
      });
      const sentAt = opts.deliverAt ?? new Date();
      await this.prisma.$transaction([
        this.prisma.campaign.update({ where: { id: campaignId }, data: { status: 'sent', sentAt } }),
        this.prisma.delivery.update({
          where: { campaignId },
          data: { status: 'sent', providerMessageId: messageId ?? null },
        }),
      ]);
      return true;
    } catch (e) {
      // The campaign stays `scheduled` so a later pass can retry; the claim is released.
      await this.prisma.delivery.delete({ where: { campaignId } }).catch(() => undefined);
      this.logger.error(`Failed to send campaign ${campaignId}: ${String(e)}`);
      return false;
    }
  }

  private async failDelivery(campaignId: string, reason: string) {
    await this.prisma.delivery.update({ where: { campaignId }, data: { status: 'failed' } });
    this.logger.warn(`Campaign ${campaignId} not sent: ${reason}`);
  }

  private pickTranslation<T extends { locale: Locale }>(rows: T[], locale: Locale): T | undefined {
    return rows.find((r) => r.locale === locale) ?? rows.find((r) => r.locale === DEFAULT_LOCALE);
  }
}
