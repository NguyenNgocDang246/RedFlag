import { Injectable } from '@nestjs/common';
import { Locale, TestFrequency } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TestSettingsService } from '../consent/test-settings.service';
import { OnboardingDto } from '../dto/onboarding.dto';
import { saveInterests } from '../training-prefs';

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

    // Training prefs (independent of Test). Same saver the /me profile form uses.
    const interests = await saveInterests(this.prisma, userId, dto.training.interests);

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
