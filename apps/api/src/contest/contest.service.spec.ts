import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import type { TrainingService } from '../training/training.service';
import { ContestService } from './contest.service';

// R5: every lookup is scoped to the owner — another user's round looks like it doesn't exist.
describe('ContestService ownership', () => {
  const findFirst = vi.fn(async ({ where }: { where: { id: string; userId: string } }) =>
    where.userId === 'owner'
      ? { id: where.id, userId: 'owner', status: 'finished' }
      : null,
  );
  const prisma = { contestSession: { findFirst } } as unknown as PrismaService;
  const service = new ContestService(prisma, {} as TrainingService);

  it.each([
    ['current', () => service.current('intruder', 'c1')],
    ['answer', () => service.answer('intruder', 'c1', 0, true, [])],
    ['result', () => service.result('intruder', 'c1', 'en')],
  ])('%s → 404 for someone else', async (_name, call) => {
    await expect(call()).rejects.toBeInstanceOf(NotFoundException);
  });

  it('owner reaches their own round', async () => {
    await expect(service.current('owner', 'c1')).resolves.toEqual({ finished: true });
  });
});
