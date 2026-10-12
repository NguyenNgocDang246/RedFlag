import { Injectable } from '@nestjs/common';
import { Locale, TestFrequency } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TestSettingsService } from '../consent/test-settings.service';
import { OnboardingDto } from '../dto/onboarding.dto';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly testSettings: TestSettingsService,
  ) {}

  async submit(userId: string, dto: OnboardingDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    // Profile (optional) — includes locale.
    const nextLocale: Locale = (dto.profile?.locale as Locale | undefined) ?? user.locale;
    if (dto.profile) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          name: dto.profile.name ?? undefined,
          occupation: dto.profile.occupation ?? undefined,
          servicesUsed: dto.profile.servicesUsed ?? undefined,
          locale: nextLocale,
        },
      });
    }

    // Training prefs (independent of Test). Categories are data → filtered against the DB.
    const known = await this.prisma.category.findMany({
      where: { code: { in: dto.training.interests } },
      select: { code: true },
    });
    const knownCodes = new Set(known.map((c) => c.code));
    const interests = dto.training.interests.filter((c) => knownCodes.has(c));
    await this.prisma.userTrainingPrefs.upsert({
      where: { userId },
      create: { userId, interests },
      update: { interests },
    });

    // Test flow (independent). Enabling requires the exact confirmation phrase (type-to-confirm).
    if (dto.test.enabled) {
      await this.testSettings.enable(
        userId,
        nextLocale,
        dto.test.confirmationText,
        dto.test.frequency as TestFrequency | undefined,
      );
    } else {
      await this.prisma.userTestOptin.upsert({
        where: { userId },
        create: { userId, enabled: false, frequency: TestFrequency.off },
        update: { enabled: false },
      });
    }

    return {
      ok: true,
      training: { interests },
      test: { enabled: dto.test.enabled },
    };
  }
}
