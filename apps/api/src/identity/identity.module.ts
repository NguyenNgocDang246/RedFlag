import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { SessionService } from './auth/session.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { OnboardingController } from './onboarding/onboarding.controller';
import { OnboardingService } from './onboarding/onboarding.service';
import { TestSettingsController } from './consent/test-settings.controller';
import { TestSettingsService } from './consent/test-settings.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      // Factory chạy lúc init (sau loadEnv) nên đọc được SESSION_SECRET.
      useFactory: () => ({
        secret: process.env.SESSION_SECRET ?? 'dev-insecure-secret',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController, OnboardingController, TestSettingsController],
  providers: [AuthService, SessionService, OnboardingService, TestSettingsService, JwtAuthGuard],
})
export class IdentityModule {}
