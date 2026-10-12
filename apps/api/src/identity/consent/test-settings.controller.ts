import { Body, Controller, Get, HttpCode, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, type AuthedUser } from '../auth/jwt-auth.guard';
import { EnableTestDto, TestFrequencyDto } from '../dto/onboarding.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { TestSettingsService } from './test-settings.service';

@Controller('test')
@UseGuards(JwtAuthGuard)
export class TestSettingsController {
  constructor(
    private readonly settings: TestSettingsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  status(@CurrentUser() user: AuthedUser) {
    return this.settings.status(user.id);
  }

  /** Turn on from the /me page. The confirmation phrase is checked in the user's own language. */
  @Post('enable')
  @HttpCode(200)
  async enable(@CurrentUser() user: AuthedUser, @Body() dto: EnableTestDto) {
    const { locale } = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { locale: true } });
    return this.settings.enable(user.id, dto.locale ?? locale, dto.confirmationText, dto.frequency);
  }

  @Patch('frequency')
  frequency(@CurrentUser() user: AuthedUser, @Body() dto: TestFrequencyDto) {
    return this.settings.setFrequency(user.id, dto.frequency);
  }

  @Post('pause')
  @HttpCode(200)
  pause(@CurrentUser() user: AuthedUser) {
    return this.settings.pause(user.id);
  }

  @Post('resume')
  @HttpCode(200)
  resume(@CurrentUser() user: AuthedUser) {
    return this.settings.resume(user.id);
  }

  @Post('unsubscribe')
  @HttpCode(200)
  unsubscribe(@CurrentUser() user: AuthedUser) {
    return this.settings.unsubscribe(user.id);
  }
}
