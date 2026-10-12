import { describe, expect, it, vi } from 'vitest';
import type { MailService } from '../mail/mail.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { DeliveryConfig } from './delivery.config';
import { DeliveryService } from './delivery.service';

const HOUR = 60 * 60 * 1000;
const NOW = new Date('2026-10-13T00:00:00Z');

interface Row {
  id: string;
  status: string;
  scheduledAt: Date;
}

function setup(rows: Row[], sendResult: (id: string) => boolean = () => true) {
  const prisma = {
    campaign: {
      findMany: async ({ where, take }: { where: { scheduledAt: { lte: Date }; id: { notIn: string[] } }; take: number }) =>
        rows
          .filter((r) => r.status === 'scheduled' && r.scheduledAt <= where.scheduledAt.lte && !where.id.notIn.includes(r.id))
          .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
          .slice(0, take),
      updateMany: async ({ where, data }: { where: { id: string }; data: { status: string } }) => {
        const row = rows.find((r) => r.id === where.id);
        if (row) row.status = data.status;
        return { count: row ? 1 : 0 };
      },
    },
  } as unknown as PrismaService;
  const service = new DeliveryService(prisma, {} as MailService, {} as DeliveryConfig);
  const send = vi
    .spyOn(service, 'sendCampaign')
    .mockImplementation(async (id: string) => sendResult(id));
  return { service, send, rows };
}

describe('DeliveryService.handOffDue', () => {
  it('hands over the next day of tests with their delivery time, and leaves later ones alone', async () => {
    const { service, send } = setup([
      { id: 'soon', status: 'scheduled', scheduledAt: new Date(NOW.getTime() + 9 * HOUR) },
      { id: 'tomorrow-late', status: 'scheduled', scheduledAt: new Date(NOW.getTime() + 24.5 * HOUR) },
      { id: 'next-week', status: 'scheduled', scheduledAt: new Date(NOW.getTime() + 7 * 24 * HOUR) },
    ]);

    expect(await service.handOffDue(NOW)).toBe(2);
    expect(send).toHaveBeenCalledWith('soon', { deliverAt: new Date(NOW.getTime() + 9 * HOUR) });
    expect(send).toHaveBeenCalledWith('tomorrow-late', { deliverAt: new Date(NOW.getTime() + 24.5 * HOUR) });
    expect(send).not.toHaveBeenCalledWith('next-week', expect.anything());
  });

  it('sends an overdue test right away, and drops one too late to still make sense', async () => {
    const { service, send, rows } = setup([
      { id: 'overdue', status: 'scheduled', scheduledAt: new Date(NOW.getTime() - 2 * HOUR) },
      { id: 'stale', status: 'scheduled', scheduledAt: new Date(NOW.getTime() - 13 * HOUR) },
    ]);

    await service.handOffDue(NOW);
    expect(send).toHaveBeenCalledWith('overdue', { deliverAt: undefined });
    expect(send).not.toHaveBeenCalledWith('stale', expect.anything());
    expect(rows.find((r) => r.id === 'stale')?.status).toBe('expired');
  });

  it('tries a failing test once per run instead of looping on it', async () => {
    const { service, send } = setup(
      [{ id: 'broken', status: 'scheduled', scheduledAt: new Date(NOW.getTime() + HOUR) }],
      () => false,
    );

    expect(await service.handOffDue(NOW)).toBe(0);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
