import { Injectable, NotFoundException } from '@nestjs/common';
import { EventType, Locale, TrackingPurpose } from '@prisma/client';
import { DEFAULT_LOCALE } from '@redflag/shared';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Turns a tracking link into a signal (R2): which campaign was opened or clicked, nothing more.
 * No endpoint here accepts or stores anything the user typed, and none of them returns personal
 * data — the token is a capability, so a link forwarded by accident reveals nothing about its owner.
 */
@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolves a live token. Unknown, expired and revoked tokens are indistinguishable from outside. */
  private async resolve(token: string, purpose: TrackingPurpose) {
    const row = await this.prisma.trackingToken.findUnique({
      where: { token },
      include: { campaign: { select: { id: true, userId: true, locale: true, variantId: true } } },
    });
    if (!row || row.purpose !== purpose || row.revokedAt || row.expiresAt < new Date()) return null;
    return row;
  }

  /**
   * Records an event once per campaign. A mail client that reloads images, or a user who clicks the
   * same link twice, must not look like repeated behaviour.
   */
  private async recordOnce(campaignId: string, userId: string, type: EventType) {
    const existing = await this.prisma.event.findFirst({ where: { campaignId, type }, select: { id: true } });
    if (existing) return;
    await this.prisma.event.create({ data: { campaignId, userId, type } });
  }

  /** Open-tracking pixel. Silent: an unknown token still gets the image back. */
  async registerOpen(token: string): Promise<void> {
    const row = await this.resolve(token, TrackingPurpose.open);
    if (!row) return;
    await this.recordOnce(row.campaign.id, row.campaign.userId, EventType.opened);
  }

  /**
   * A click is "caught" — the user acted on the simulated scam. Nothing is asked of them and no
   * fake form is shown; they go straight to the page that explains what they missed.
   */
  async registerClick(token: string): Promise<{ locale: Locale } | null> {
    const row = await this.resolve(token, TrackingPurpose.click);
    if (!row) return null;
    await this.recordOnce(row.campaign.id, row.campaign.userId, EventType.clicked);
    return { locale: row.campaign.locale };
  }

  /**
   * What the teach page shows: the red flags this email carried, in the campaign's language.
   * Keyed by the same token, so it needs no sign-in — and returns nothing about the recipient.
   */
  async teachContent(token: string, localeParam?: Locale) {
    const row = await this.resolve(token, TrackingPurpose.click);
    if (!row) throw new NotFoundException('Link not found');

    const locale = localeParam ?? row.campaign.locale;
    const pick = <T extends { locale: Locale }>(rows: T[]) =>
      rows.find((r) => r.locale === locale) ?? rows.find((r) => r.locale === DEFAULT_LOCALE);

    const variant = await this.prisma.variant.findUniqueOrThrow({
      where: { id: row.campaign.variantId },
      include: {
        translations: true,
        signals: { include: { signal: { include: { translations: true } } } },
        template: { include: { category: { include: { translations: true } } } },
      },
    });

    const content = pick(variant.translations);
    const category = variant.template.category;
    return {
      subject: content?.subject ?? '',
      senderName: content?.senderName ?? '',
      body: content?.body ?? '',
      category: category
        ? { code: category.code, name: pick(category.translations)?.name ?? category.code }
        : null,
      signals: variant.signals.map((vs) => {
        const t = pick(vs.signal.translations);
        return {
          code: vs.signal.code,
          name: t?.name ?? vs.signal.code,
          explanation: t?.explanation ?? '',
        };
      }),
    };
  }
}
