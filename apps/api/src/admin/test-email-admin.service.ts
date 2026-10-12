import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Locale } from '@prisma/client';
import { DEFAULT_LOCALE, renderSimEmail } from '@redflag/shared';
import { DeliveryService } from '../delivery/delivery.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Admin side of the email tests (Phase 4): see what can be sent, preview it exactly as it will
 * arrive, and send one to yourself before it ever goes to a learner.
 */
@Injectable()
export class TestEmailAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly delivery: DeliveryService,
  ) {}

  private pick<T extends { locale: Locale }>(rows: T[], locale: Locale): T | undefined {
    return rows.find((r) => r.locale === locale) ?? rows.find((r) => r.locale === DEFAULT_LOCALE);
  }

  /** Templates with their variants. Drafts are listed too, but the scheduler only sends published ones. */
  async list(ui: Locale = DEFAULT_LOCALE) {
    const templates = await this.prisma.template.findMany({
      orderBy: { code: 'asc' },
      include: {
        translations: true,
        category: { include: { translations: true } },
        variants: {
          orderBy: { createdAt: 'asc' },
          include: {
            translations: { select: { locale: true, senderName: true, subject: true } },
            signals: { include: { signal: true } },
          },
        },
      },
    });

    return templates.map((t) => ({
      id: t.id,
      code: t.code,
      status: t.status,
      title: this.pick(t.translations, ui)?.title ?? t.code,
      category: t.category
        ? { code: t.category.code, name: this.pick(t.category.translations, ui)?.name ?? t.category.code }
        : null,
      variants: t.variants.map((v) => ({
        id: v.id,
        difficulty: v.difficultyLevel,
        locales: v.translations.map((x) => x.locale),
        subject: this.pick(v.translations, ui)?.subject ?? '',
        senderName: this.pick(v.translations, ui)?.senderName ?? '',
        signals: v.signals.map((s) => s.signal.code),
      })),
    }));
  }

  /** The rendered email, exactly as the worker would build it — minus the tracking pixel. */
  async preview(variantId: string, locale: Locale) {
    const variant = await this.prisma.variant.findUnique({
      where: { id: variantId },
      include: { translations: true },
    });
    if (!variant) throw new NotFoundException('Test email not found');
    const content = this.pick(variant.translations, locale);
    if (!content) throw new BadRequestException('This test email has no content in that language');

    const mail = renderSimEmail({
      locale: locale as 'en' | 'vi',
      subject: content.subject,
      body: content.body,
      name: null,
      // A placeholder: previews are never clickable, so no real token is spent on them.
      linkUrl: '#preview-link',
    });
    return { senderName: content.senderName, ...mail };
  }

  /**
   * Sends one test email to the admin's own address, right now. Scoped to themselves — this takes
   * no recipient, so it cannot be used to send to anyone else (R1).
   */
  async sendToSelf(variantId: string, adminId: string, locale: Locale) {
    const [variant, admin] = await Promise.all([
      this.prisma.variant.findUnique({ where: { id: variantId }, include: { translations: true } }),
      this.prisma.user.findUniqueOrThrow({ where: { id: adminId }, select: { emailVerifiedAt: true } }),
    ]);
    if (!variant) throw new NotFoundException('Test email not found');
    if (!this.pick(variant.translations, locale)) {
      throw new BadRequestException('This test email has no content in that language');
    }
    if (!admin.emailVerifiedAt) throw new BadRequestException('Verify your own email address first');

    const campaign = await this.prisma.campaign.create({
      data: { userId: adminId, variantId, locale, isTest: true, scheduledAt: new Date() },
      select: { id: true },
    });
    const sent = await this.delivery.sendCampaign(campaign.id);
    if (!sent) throw new BadRequestException('Could not send — check the mail server');
    return { ok: true, campaignId: campaign.id };
  }
}
