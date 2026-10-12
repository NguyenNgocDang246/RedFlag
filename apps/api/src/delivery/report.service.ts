import { Injectable, NotFoundException } from '@nestjs/common';
import { EventType, Locale } from '@prisma/client';
import { DEFAULT_LOCALE } from '@redflag/shared';
import { PrismaService } from '../prisma/prisma.service';

/** How far back the report page looks. Older exercises drop off the list. */
export const WINDOW_DAYS = 30;

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Reporting a test email from the site — the good reflex, and the counterpart to clicking it.
 *
 * Everything here is scoped to the signed-in user's own campaigns (R5), and the list deliberately
 * carries no tracking tokens: it describes the emails in the words the learner saw them in.
 */
@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  private pick<T extends { locale: Locale }>(rows: T[], locale: Locale): T | undefined {
    return rows.find((r) => r.locale === locale) ?? rows.find((r) => r.locale === DEFAULT_LOCALE);
  }

  /** The user's recent test emails, newest first, with what they have already done about each. */
  async listMine(userId: string, locale: Locale) {
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        userId,
        status: 'sent',
        sentAt: { gte: new Date(Date.now() - WINDOW_DAYS * DAY_MS) },
      },
      orderBy: { sentAt: 'desc' },
      include: {
        events: { select: { type: true, reportedSignalId: true } },
        variant: { include: { translations: { select: { locale: true, senderName: true, subject: true } } } },
      },
    });

    return campaigns.map((c) => {
      const content = this.pick(c.variant.translations, locale);
      const types = new Set(c.events.map((e) => e.type));
      return {
        id: c.id,
        sentAt: c.sentAt,
        senderName: content?.senderName ?? '',
        subject: content?.subject ?? '',
        reported: types.has(EventType.reported),
        // A forwarded report arrives without the "which sign?" answer; the page asks for it later.
        signalPicked: c.events.some((e) => e.type === EventType.reported && e.reportedSignalId !== null),
        // Shown so the page can say "you already clicked this one" instead of silently accepting a report.
        clicked: types.has(EventType.clicked),
      };
    });
  }

  /**
   * The one place a `reported` event is written, shared by the button on the site and the forwarded
   * mail webhook. Recorded once per campaign; a second report changes nothing.
   */
  async recordReported(campaignId: string, userId: string): Promise<void> {
    const existing = await this.prisma.event.findFirst({
      where: { campaignId, type: EventType.reported },
      select: { id: true },
    });
    if (!existing) {
      await this.prisma.event.create({ data: { campaignId, userId, type: EventType.reported } });
    }
  }

  private async mustOwn(userId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, userId, status: 'sent' },
      select: { id: true, userId: true, variantId: true, locale: true },
    });
    if (!campaign) throw new NotFoundException('Test email not found');
    return campaign;
  }

  /**
   * Records that the user spotted this one. Recorded once; reporting again is accepted silently so
   * a double tap never looks like two reports.
   *
   * Returns the red flags the email actually carried, so the page can ask which one gave it away —
   * a multiple choice, never a free-text box (R2).
   */
  async report(userId: string, campaignId: string, locale: Locale) {
    const campaign = await this.mustOwn(userId, campaignId);

    await this.recordReported(campaignId, userId);

    const variant = await this.prisma.variant.findUniqueOrThrow({
      where: { id: campaign.variantId },
      include: { signals: { include: { signal: { include: { translations: true } } } } },
    });

    return {
      ok: true as const,
      signals: variant.signals.map((vs) => {
        const t = this.pick(vs.signal.translations, locale);
        return { code: vs.signal.code, name: t?.name ?? vs.signal.code };
      }),
    };
  }

  /** Records which red flag made them suspicious — confirms they really recognised it, not just guessed. */
  async setReportedSignal(userId: string, campaignId: string, signalCode: string) {
    await this.mustOwn(userId, campaignId);
    const [signal, event] = await Promise.all([
      this.prisma.signal.findUnique({ where: { code: signalCode }, select: { id: true } }),
      this.prisma.event.findFirst({
        where: { campaignId, type: EventType.reported },
        select: { id: true },
      }),
    ]);
    if (!signal) throw new NotFoundException('Sign not found');
    if (!event) throw new NotFoundException('Report this email first');

    await this.prisma.event.update({ where: { id: event.id }, data: { reportedSignalId: signal.id } });
    return { ok: true as const };
  }
}
