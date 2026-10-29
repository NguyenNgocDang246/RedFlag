import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Locale } from '@prisma/client';
import { DEFAULT_LOCALE, isSupportedLocale } from '@redflag/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, type AuthedUser } from '../auth/jwt-auth.guard';
import { expectedPhrase, reportChannels, warningText } from '../confirmation';
import { OnboardingDto } from '../dto/onboarding.dto';
import { OnboardingService } from './onboarding.service';
import { OnboardingResult, TestWarningResponse } from '../dto/identity-response.dto';

@ApiTags('onboarding')
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  /** Warning text + expected confirmation phrase for the locale (for the frontend). Public. */
  @Get('test-warning')
  warning(@Query('locale') localeParam?: string): TestWarningResponse {
    const locale: Locale =
      localeParam && isSupportedLocale(localeParam) ? (localeParam as Locale) : DEFAULT_LOCALE;
    const channels = reportChannels();
    return {
      locale,
      warning: warningText(locale),
      confirmPhrase: expectedPhrase(locale),
      // So the UI can turn the two routes into a link and a copyable address.
      reportPageUrl: channels.pageUrl,
      reportAddress: channels.address,
    };
  }

  @Post()
  @HttpCode(200)
  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  submit(@CurrentUser() user: AuthedUser, @Body() dto: OnboardingDto): Promise<OnboardingResult> {
    return this.onboarding.submit(user.id, dto);
  }
}
