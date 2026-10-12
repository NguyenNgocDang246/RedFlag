import { describe, expect, it, vi } from 'vitest';
import type { MailService } from '../../mail/mail.service';
import type { PrismaService } from '../../prisma/prisma.service';
import { TestSettingsService } from './test-settings.service';

function setup(cancelScheduled: (id: string) => Promise<void>) {
  const campaignUpdates: { id: string; status: string }[] = [];
  const prisma = {
    userTestOptin: {
      findUnique: async () => ({ userId: 'u1', enabled: true, frequency: 'medium' }),
      update: vi.fn(),
    },
    campaign: {
      updateMany: vi.fn(),
      // One test already handed to the provider, due to land later today.
      findMany: async () => [{ id: 'c1', delivery: { providerMessageId: 'msg_1' } }],
      update: ({ where, data }: { where: { id: string }; data: { status: string } }) => {
        campaignUpdates.push({ id: where.id, status: data.status });
      },
    },
    delivery: { update: vi.fn() },
    $transaction: async (ops: unknown[]) => ops,
  } as unknown as PrismaService;
  const mail = { cancelScheduled: vi.fn(cancelScheduled) } as unknown as MailService;
  return { service: new TestSettingsService(prisma, mail), mail, campaignUpdates };
}

describe('TestSettingsService: tests already handed to the mail provider', () => {
  it('pausing calls back a test that has not landed yet (R1)', async () => {
    const { service, mail, campaignUpdates } = setup(async () => undefined);

    await service.pause('u1');
    expect(mail.cancelScheduled).toHaveBeenCalledWith('msg_1');
    expect(campaignUpdates).toEqual([{ id: 'c1', status: 'cancelled' }]);
  });

  it('keeps the record as sent when the provider says it already went out', async () => {
    const { service, campaignUpdates } = setup(async () => {
      throw new Error('already sent');
    });

    await expect(service.pause('u1')).resolves.toEqual({ enabled: false, paused: true });
    expect(campaignUpdates).toEqual([]);
  });
});
