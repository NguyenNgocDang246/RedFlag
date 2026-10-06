import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, type AuthedUser } from '../auth/jwt-auth.guard';
import { TestSettingsService } from './test-settings.service';

@Controller('test')
@UseGuards(JwtAuthGuard)
export class TestSettingsController {
  constructor(private readonly settings: TestSettingsService) {}

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
