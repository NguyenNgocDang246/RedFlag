import { BadRequestException, Injectable } from '@nestjs/common';
import { Locale, TestFrequency } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CONFIRMATION_TEXT_VERSION,
  confirmationMatches,
  expectedPhrase,
} from '../confirmation';
import { OnboardingDto } from '../dto/onboarding.dto';

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(userId: string, dto: OnboardingDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    // Profile (tuỳ chọn) — gồm locale.
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

    // Training prefs (độc lập với Test).
    await this.prisma.userTrainingPrefs.upsert({
      where: { userId },
      create: { userId, interests: dto.training.interests },
      update: { interests: dto.training.interests },
    });

    // Test flow (độc lập). Bật = phải gõ đúng câu xác nhận (type-to-confirm).
    if (dto.test.enabled) {
      if (!confirmationMatches(dto.test.confirmationText, nextLocale)) {
        throw new BadRequestException({
          message: 'Câu xác nhận chưa đúng / Confirmation phrase does not match',
          expectedPhrase: expectedPhrase(nextLocale),
          locale: nextLocale,
        });
      }

      const frequency = (dto.test.frequency as TestFrequency | undefined) ?? TestFrequency.medium;
      await this.prisma.userTestOptin.upsert({
        where: { userId },
        create: { userId, enabled: true, frequency },
        update: { enabled: true, frequency },
      });

      await this.prisma.consent.create({
        data: {
          userId,
          type: 'test_flow',
          textVersion: CONFIRMATION_TEXT_VERSION,
          locale: nextLocale,
          confirmationText: dto.test.confirmationText,
        },
      });
    } else {
      await this.prisma.userTestOptin.upsert({
        where: { userId },
        create: { userId, enabled: false, frequency: TestFrequency.off },
        update: { enabled: false },
      });
    }

    return {
      ok: true,
      training: { interests: dto.training.interests },
      test: { enabled: dto.test.enabled },
    };
  }
}
