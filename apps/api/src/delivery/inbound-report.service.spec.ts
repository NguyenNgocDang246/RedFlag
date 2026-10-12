import { beforeEach, describe, expect, it } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { InboundReportService, normalizeSubject } from './inbound-report.service';
import type { ReportService } from './report.service';

describe('normalizeSubject', () => {
  it('strips forward and reply prefixes, repeatedly and in several languages', () => {
    const base = 'your account has been locked';
    for (const s of [
      'Your account has been LOCKED',
      'Fwd: Your account has been locked',
      'FW: Your account has been locked',
      'Fw:Your account has been locked',
      'TR: Your account has been locked',
      'WG: Your account has been locked',
      'Fwd: Fwd: Re: Your account has been locked',
      'Fwd[2]: Your account has been locked',
      '[Fwd: Your account has been locked]',
      '  Fwd:   Your   account has been locked  ',
    ]) {
      expect(normalizeSubject(s)).toBe(base);
    }
  });

  it('keeps the rest of the subject intact', () => {
    expect(normalizeSubject('Fwd: [Bank] Re-confirm: payment')).toBe('[bank] re-confirm: payment');
  });
});

interface CampaignRow {
  id: string;
  userId: string;
  locale: 'en' | 'vi';
  sentAt: Date;
  reported: boolean;
  subjects: { en?: string; vi?: string };
}

const REPORT = 'report@redflag.local';

function setup(campaigns: CampaignRow[]) {
  const users = [{ id: 'u1', email: 'learner@example.com' }];
  const recorded: { campaignId: string; userId: string }[] = [];
  const prisma = {
    user: {
      findUnique: async ({ where }: { where: { email: string } }) =>
        users.find((u) => u.email === where.email) ?? null,
    },
    campaign: {
      findMany: async ({ where }: { where: { userId: string } }) =>
        campaigns
          .filter((c) => c.userId === where.userId)
          .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
          .map((c) => ({
            id: c.id,
            locale: c.locale,
            events: c.reported ? [{ id: 'e' }] : [],
            variant: {
              translations: Object.entries(c.subjects).map(([locale, subject]) => ({ locale, subject })),
            },
          })),
    },
  } as unknown as PrismaService;
  const reports = {
    recordReported: async (campaignId: string, userId: string) => {
      recorded.push({ campaignId, userId });
    },
  } as unknown as ReportService;
  return { service: new InboundReportService(prisma, reports), recorded };
}

const received = (data: Record<string, unknown>) => ({
  type: 'email.received',
  data: { from: 'learner@example.com', to: [REPORT], subject: 'Fwd: Parcel on hold', ...data },
});

describe('InboundReportService', () => {
  beforeEach(() => {
    process.env.REPORT_EMAIL = REPORT;
  });

  const parcel: CampaignRow = {
    id: 'c1',
    userId: 'u1',
    locale: 'en',
    sentAt: new Date('2026-10-10T09:00:00Z'),
    reported: false,
    subjects: { en: 'Parcel on hold', vi: 'Bưu kiện bị giữ' },
  };

  it('matches a forwarded test email by sender and subject', async () => {
    const { service, recorded } = setup([parcel]);
    expect(await service.handle(received({}))).toEqual({ result: 'matched', campaignId: 'c1' });
    expect(recorded).toEqual([{ campaignId: 'c1', userId: 'u1' }]);
  });

  it('matches the subject in the language the email was sent in, and only that one', async () => {
    const { service } = setup([{ ...parcel, locale: 'vi' }]);
    expect(await service.handle(received({ subject: 'TR: Bưu kiện bị giữ' }))).toMatchObject({ result: 'matched' });
    expect(await service.handle(received({}))).toEqual({ result: 'unmatched' });
  });

  it('accepts the sender and report address in any case', async () => {
    const { service } = setup([parcel]);
    expect(
      await service.handle(received({ from: 'Learner@Example.com', to: ['Report@RedFlag.local'] })),
    ).toMatchObject({ result: 'matched' });
  });

  it('prefers the newest unreported campaign when the same email was sent twice', async () => {
    const older = { ...parcel, id: 'old', sentAt: new Date('2026-10-01T09:00:00Z') };
    const newer = { ...parcel, id: 'new', reported: true };
    const { service } = setup([older, newer]);
    expect(await service.handle(received({}))).toEqual({ result: 'matched', campaignId: 'old' });
  });

  it('does not match an unknown sender or a different subject', async () => {
    const { service, recorded } = setup([parcel]);
    expect(await service.handle(received({ from: 'someone@else.com' }))).toEqual({ result: 'unmatched' });
    expect(await service.handle(received({ subject: 'Fwd: Lunch?' }))).toEqual({ result: 'unmatched' });
    expect(recorded).toEqual([]);
  });

  it('ignores mail not addressed to the report inbox, and other event types', async () => {
    const { service } = setup([parcel]);
    expect(await service.handle(received({ to: ['hello@redflag.local'] }))).toEqual({ result: 'ignored' });
    expect(await service.handle({ type: 'email.sent', data: {} })).toEqual({ result: 'ignored' });
    expect(await service.handle({ type: 'email.received' })).toEqual({ result: 'ignored' });
  });
});
