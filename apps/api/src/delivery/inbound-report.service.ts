import { Injectable } from '@nestjs/common';
import { EventType } from '@prisma/client';
import { reportChannels } from '../identity/confirmation';
import { PrismaService } from '../prisma/prisma.service';
import { DAY_MS, ReportService, WINDOW_DAYS } from './report.service';

/** Forward/reply prefixes mail apps put in front of a subject, across the languages we expect. */
const PREFIX = /^(?:fwd?|tr|wg|rv|re|aw|sv|vs)\s*(?:\[\d+\])?\s*:\s*/i;
/** Older clients wrap the whole subject instead: "[Fwd: …]". */
const WRAPPED = /^\[fwd?:\s*(.*)\]$/i;

/**
 * A subject as the learner first received it: forward/reply prefixes stripped (repeatedly — a mail
 * forwarded twice reads "Fwd: Fwd: …"), whitespace collapsed, case folded.
 */
export function normalizeSubject(subject: string): string {
  let s = subject.replace(/\s+/g, ' ').trim();
  for (let prev = ''; prev !== s; ) {
    prev = s;
    s = s.replace(PREFIX, '').replace(WRAPPED, '$1').trim();
  }
  return s.toLowerCase();
}

/** The fields of Resend's `email.received` event we read. The body is never fetched (R2). */
interface ReceivedEvent {
  type?: unknown;
  data?: { from?: unknown; to?: unknown; subject?: unknown };
}

export type InboundOutcome =
  | { result: 'ignored' }
  | { result: 'unmatched' }
  | { result: 'matched'; campaignId: string };

/**
 * Reporting a test email by forwarding it to REPORT_EMAIL.
 *
 * Matched on metadata alone: the sender must be the learner's account address and the subject,
 * once "Fwd:" is stripped, must be one of their recent test emails. No token in the subject (that
 * would give the exercise away, R3), and nothing from the mail is stored (R2).
 *
 * The webhook carries no SPF/DKIM result, so the sender could be forged. The worst that does is a
 * false "reported" on someone else's exercise, and only by someone who knows both their address and
 * the subject — an accepted risk.
 */
@Injectable()
export class InboundReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportService,
  ) {}

  async handle(event: ReceivedEvent): Promise<InboundOutcome> {
    if (event.type !== 'email.received' || !event.data) return { result: 'ignored' };
    const { from, to, subject } = event.data;
    if (typeof from !== 'string' || typeof subject !== 'string' || !Array.isArray(to)) {
      return { result: 'ignored' };
    }

    const reportAddress = reportChannels().address.toLowerCase();
    if (!to.some((addr) => typeof addr === 'string' && addr.trim().toLowerCase() === reportAddress)) {
      return { result: 'ignored' };
    }

    const user = await this.prisma.user.findUnique({
      where: { email: from.trim().toLowerCase() },
      select: { id: true },
    });
    if (!user) return { result: 'unmatched' };

    const wanted = normalizeSubject(subject);
    if (!wanted) return { result: 'unmatched' };

    const campaigns = await this.prisma.campaign.findMany({
      where: {
        userId: user.id,
        status: 'sent',
        sentAt: { gte: new Date(Date.now() - WINDOW_DAYS * DAY_MS) },
      },
      orderBy: { sentAt: 'desc' },
      select: {
        id: true,
        locale: true,
        events: { where: { type: EventType.reported }, select: { id: true } },
        variant: { select: { translations: { select: { locale: true, subject: true } } } },
      },
    });

    const matches = campaigns.filter((c) => {
      const sent = c.variant.translations.find((t) => t.locale === c.locale);
      return sent !== undefined && normalizeSubject(sent.subject) === wanted;
    });
    // Same email sent twice: credit the newest one not yet reported, else the newest.
    const campaign = matches.find((c) => c.events.length === 0) ?? matches[0];
    if (!campaign) return { result: 'unmatched' };

    await this.reports.recordReported(campaign.id, user.id);
    return { result: 'matched', campaignId: campaign.id };
  }
}
