import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Locale } from '@prisma/client';
import { DEFAULT_LOCALE, isSupportedLocale } from '@redflag/shared';
import { CurrentUser } from '../identity/auth/current-user.decorator';
import { JwtAuthGuard, type AuthedUser } from '../identity/auth/jwt-auth.guard';
import { ProgressService } from './progress.service';

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get()
  get(@CurrentUser() user: AuthedUser, @Query('locale') locale?: string) {
    const l: Locale =
      locale && isSupportedLocale(locale) ? (locale as Locale) : DEFAULT_LOCALE;
    return this.progress.forUser(user.id, l);
  }
}
