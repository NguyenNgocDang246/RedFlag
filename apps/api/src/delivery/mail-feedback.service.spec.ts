import { describe, expect, it } from 'vitest';
import type { TestStopReason } from '@prisma/client';
import type { TestSettingsService } from '../identity/consent/test-settings.service';
import type { PrismaService } from '../prisma/prisma.service';
import { MailFeedbackService } from './mail-feedback.service';

function setup(isTest = false) {
  const deliveries = [{ campaignId: 'c1', providerMessageId: 'msg-1', status: 'sent', isTest }];
  const stopped: { userId: string; reason: TestStopReason }[] = [];
  const prisma = {
    delivery: {
      findFirst: async ({ where }: { where: { providerMessageId: string } }) => {
        const d = deliveries.find((x) => x.providerMessageId === where.providerMessageId);
        return d ? { campaignId: d.campaignId, campaign: { userId: 'u1', isTest: d.isTest } } : null;
      },
      update: async ({ where, data }: { where: { campaignId: string }; data: { status: string } }) => {
        const d = deliveries.find((x) => x.campaignId === where.campaignId)!;
        d.status = data.status;
        return d;
      },
    },
  };
  const testSettings = {
    stopBySystem: async (userId: string, reason: TestStopReason) => {
      stopped.push({ userId, reason });
    },
  };
  const service = new MailFeedbackService(
    prisma as unknown as PrismaService,
    testSettings as unknown as TestSettingsService,
  );
  return { service, deliveries, stopped };
}

describe('MailFeedbackService', () => {
  it('turns tests off for good on a spam complaint', async () => {
    const { service, deliveries, stopped } = setup();
    const out = await service.handle({ type: 'email.complained', data: { email_id: 'msg-1' } });
    expect(out).toEqual({ result: 'recorded', campaignId: 'c1', stopped: 'complained' });
    expect(deliveries[0].status).toBe('complained');
    expect(stopped).toEqual([{ userId: 'u1', reason: 'complained' }]);
  });

  it('pauses tests on a permanent bounce', async () => {
    const { service, deliveries, stopped } = setup();
    await service.handle({ type: 'email.bounced', data: { email_id: 'msg-1', bounce: { type: 'Permanent' } } });
    expect(deliveries[0].status).toBe('bounced');
    expect(stopped).toEqual([{ userId: 'u1', reason: 'bounced' }]);
  });

  it('only records a temporary bounce', async () => {
    const { service, deliveries, stopped } = setup();
    await service.handle({ type: 'email.bounced', data: { email_id: 'msg-1', bounce: { type: 'Transient' } } });
    expect(deliveries[0].status).toBe('bounced');
    expect(stopped).toEqual([]);
  });

  it('never changes settings because of an admin preview', async () => {
    const { service, stopped } = setup(true);
    await service.handle({ type: 'email.complained', data: { email_id: 'msg-1' } });
    expect(stopped).toEqual([]);
  });

  it('ignores mail it did not send as a test, and other event types', async () => {
    const { service } = setup();
    expect(await service.handle({ type: 'email.complained', data: { email_id: 'other' } })).toEqual({
      result: 'unknown',
    });
    expect(await service.handle({ type: 'email.delivered', data: { email_id: 'msg-1' } })).toEqual({
      result: 'ignored',
    });
  });
});
