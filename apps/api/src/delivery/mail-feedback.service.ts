import { Injectable, Logger } from '@nestjs/common';
import { DeliveryStatus, TestStopReason } from '@prisma/client';
import { TestSettingsService } from '../identity/consent/test-settings.service';
import { PrismaService } from '../prisma/prisma.service';

/** The fields of Resend's `email.bounced` / `email.complained` events we read. */
interface FeedbackEvent {
  type?: unknown;
  data?: { email_id?: unknown; bounce?: { type?: unknown } };
}

export type FeedbackOutcome =
  | { result: 'ignored' }
  | { result: 'unknown' }
  | { result: 'recorded'; campaignId: string; stopped: TestStopReason | null };

/**
 * What the mail provider tells us after a test email left: it bounced, or the learner marked it
 * as spam. Matched to the campaign by the provider's message id, nothing else is read (R2).
 *
 * - A spam complaint turns tests off for good (consent revoked): they clearly don't want these (R1).
 * - A permanent bounce pauses them: the address can't receive mail, so sending more only hurts the
 *   sending domain. A temporary bounce is just recorded.
 * Admin previews (`isTest`) are recorded but never change anyone's settings.
 */
@Injectable()
export class MailFeedbackService {
  private readonly logger = new Logger(MailFeedbackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly testSettings: TestSettingsService,
  ) {}

  static handles(type: unknown): boolean {
    return type === 'email.bounced' || type === 'email.complained';
  }

  async handle(event: FeedbackEvent): Promise<FeedbackOutcome> {
    if (!MailFeedbackService.handles(event.type) || !event.data) return { result: 'ignored' };
    const messageId = event.data.email_id;
    if (typeof messageId !== 'string' || !messageId) return { result: 'ignored' };

    // Account emails (verification, password reset) have no Delivery row — nothing to do for them.
    const delivery = await this.prisma.delivery.findFirst({
      where: { providerMessageId: messageId },
      select: { campaignId: true, campaign: { select: { userId: true, isTest: true } } },
    });
    if (!delivery) return { result: 'unknown' };

    const complained = event.type === 'email.complained';
    const permanent =
      !complained &&
      typeof event.data.bounce?.type === 'string' &&
      event.data.bounce.type.toLowerCase() === 'permanent';

    await this.prisma.delivery.update({
      where: { campaignId: delivery.campaignId },
      data: { status: complained ? DeliveryStatus.complained : DeliveryStatus.bounced },
    });

    let stopped: TestStopReason | null = null;
    if (!delivery.campaign.isTest && (complained || permanent)) {
      stopped = complained ? TestStopReason.complained : TestStopReason.bounced;
      await this.testSettings.stopBySystem(delivery.campaign.userId, stopped);
    }
    this.logger.log(
      `Campaign ${delivery.campaignId} ${complained ? 'complained' : permanent ? 'bounced (permanent)' : 'bounced'}`,
    );
    return { result: 'recorded', campaignId: delivery.campaignId, stopped };
  }
}
