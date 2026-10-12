import { BadRequestException, Injectable } from '@nestjs/common';
import { TestFrequency } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Test flow management after onboarding (R1): pause, resume, unsubscribe.
 * Pause = keep config but stop scheduling; Unsubscribe = disable + revoke consent.
 */
@Injectable()
export class TestSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireOptin(userId: string) {
    const optin = await this.prisma.userTestOptin.findUnique({ where: { userId } });
    if (!optin) {
      throw new BadRequestException(
        'Chưa bật Test flow trong onboarding / Test flow not enabled yet',
      );
    }
    return optin;
  }

  async pause(userId: string) {
    await this.requireOptin(userId);
    await this.prisma.userTestOptin.update({ where: { userId }, data: { enabled: false } });
    return { enabled: false, paused: true };
  }

  async resume(userId: string) {
    const optin = await this.requireOptin(userId);
    // Resume only if the test_flow consent hasn't been revoked.
    const activeConsent = await this.prisma.consent.findFirst({
      where: { userId, type: 'test_flow', revokedAt: null },
    });
    if (!activeConsent) {
      throw new BadRequestException(
        'Cần xác nhận lại trong onboarding / Please re-confirm in onboarding',
      );
    }
    const frequency = optin.frequency === TestFrequency.off ? TestFrequency.medium : optin.frequency;
    await this.prisma.userTestOptin.update({
      where: { userId },
      data: { enabled: true, frequency },
    });
    return { enabled: true, frequency };
  }

  async unsubscribe(userId: string) {
    await this.requireOptin(userId);
    await this.prisma.$transaction([
      this.prisma.userTestOptin.update({
        where: { userId },
        data: { enabled: false, frequency: TestFrequency.off },
      }),
      this.prisma.consent.updateMany({
        where: { userId, type: 'test_flow', revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { enabled: false, unsubscribed: true };
  }
}
