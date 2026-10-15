import { describe, expect, it } from 'vitest';
import type { MailService } from '../mail/mail.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { DeliveryConfig } from './delivery.config';
import { DeliveryService, MAX_SEND_ATTEMPTS, nextRetryAt } from './delivery.service';

const MIN = 60 * 1000;
const NOW = new Date('2026-10-14T00:00:00Z');

describe('nextRetryAt', () => {
  it('waits longer after each failure, capped at an hour', () => {
    expect(nextRetryAt(1, NOW).getTime() - NOW.getTime()).toBe(2 * MIN);
    expect(nextRetryAt(2, NOW).getTime() - NOW.getTime()).toBe(10 * MIN);
    expect(nextRetryAt(3, NOW).getTime() - NOW.getTime()).toBe(30 * MIN);
    expect(nextRetryAt(4, NOW).getTime() - NOW.getTime()).toBe(60 * MIN);
    expect(nextRetryAt(9, NOW).getTime() - NOW.getTime()).toBe(60 * MIN);
  });
});

/** A campaign whose send always throws, with just enough of Prisma to follow it. */
function setup(sendAttempts: number) {
  const campaign = {
    id: 'c1',
    status: 'scheduled',
    isTest: false,
    locale: 'en',
    sendAttempts,
    retryAt: null as Date | null,
    user: {
      id: 'u1',
      email: 'learner@example.com',
      name: null,
      emailVerifiedAt: NOW,
      testOptin: { enabled: true },
      consents: [{ id: 'k1' }],
    },
    variant: { translations: [{ locale: 'en', senderName: 'Bank', subject: 'Hi', body: 'Click [[here]]' }] },
  };
  let delivery: { status: string } | null = null;
  const revoked: string[] = [];
  const prisma = {
    delivery: {
      create: async () => {
        delivery = { status: 'queued' };
        return delivery;
      },
      update: async ({ data }: { data: { status: string } }) => {
        delivery = { ...delivery!, ...data };
        return delivery;
      },
      delete: async () => {
        delivery = null;
      },
    },
    campaign: {
      findUnique: async () => campaign,
      update: async ({ data }: { data: Partial<typeof campaign> }) => Object.assign(campaign, data),
    },
    trackingToken: {
      createMany: async () => ({ count: 2 }),
      updateMany: async ({ where }: { where: { campaignId: string } }) => {
        revoked.push(where.campaignId);
        return { count: 2 };
      },
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  } as unknown as PrismaService;
  const mail = {
    sendSimulation: async () => {
      throw new Error('provider down');
    },
  } as unknown as MailService;
  const config = { clickUrl: (t: string) => `https://t.example/${t}`, openPixelUrl: (t: string) => `https://t.example/o/${t}` };
  const service = new DeliveryService(prisma, mail, config as unknown as DeliveryConfig);
  return { service, campaign, getDelivery: () => delivery, revoked };
}

describe('DeliveryService retry', () => {
  it('keeps a failed test scheduled, backs off, and releases the claim', async () => {
    const { service, campaign, getDelivery, revoked } = setup(0);
    expect(await service.sendCampaign('c1')).toBe(false);
    expect(campaign.status).toBe('scheduled');
    expect(campaign.sendAttempts).toBe(1);
    expect(campaign.retryAt).not.toBeNull();
    expect(getDelivery()).toBeNull();
    expect(revoked).toEqual(['c1']);
  });

  it('gives up after the last try', async () => {
    const { service, campaign, getDelivery } = setup(MAX_SEND_ATTEMPTS - 1);
    expect(await service.sendCampaign('c1')).toBe(false);
    expect(campaign.status).toBe('expired');
    expect(campaign.sendAttempts).toBe(MAX_SEND_ATTEMPTS);
    expect(getDelivery()).toEqual({ status: 'failed' });
  });
});
