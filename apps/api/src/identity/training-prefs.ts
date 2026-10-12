import { PrismaService } from '../prisma/prisma.service';

/**
 * Saves the training topics a user cares about. Categories are data (R6), so codes are filtered
 * against the DB and anything unknown is dropped. Shared by onboarding and the /me profile form.
 * Returns the codes that were actually kept.
 */
export async function saveInterests(
  prisma: PrismaService,
  userId: string,
  codes: string[],
): Promise<string[]> {
  const known = await prisma.category.findMany({
    where: { code: { in: codes } },
    select: { code: true },
  });
  const knownCodes = new Set(known.map((c) => c.code));
  const interests = [...new Set(codes.filter((c) => knownCodes.has(c)))];
  await prisma.userTrainingPrefs.upsert({
    where: { userId },
    create: { userId, interests },
    update: { interests },
  });
  return interests;
}
