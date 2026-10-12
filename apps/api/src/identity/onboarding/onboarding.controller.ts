import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { Locale } from '@prisma/client';
import { DEFAULT_LOCALE, isSupportedLocale } from '@redflag/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, type AuthedUser } from '../auth/jwt-auth.guard';
import { expectedPhrase, TEST_WARNING_I18N } from '../confirmation';
import { OnboardingDto } from '../dto/onboarding.dto';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  /** Warning text + expected confirmation phrase for the locale (for the frontend). Public. */
  @Get('test-warning')
  warning(@Query('locale') localeParam?: string) {
    const locale: Locale =
      localeParam && isSupportedLocale(localeParam) ? (localeParam as Locale) : DEFAULT_LOCALE;
    return {
      locale,
      warning: TEST_WARNING_I18N[locale].warning,
      confirmPhrase: expectedPhrase(locale),
    };
  }

  @Post()
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  submit(@CurrentUser() user: AuthedUser, @Body() dto: OnboardingDto) {
    return this.onboarding.submit(user.id, dto);
  }
}
