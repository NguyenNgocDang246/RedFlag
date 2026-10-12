import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ThrottleModule } from '../throttle/throttle.module';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { SessionService } from './auth/session.service';
import { GoogleService } from './auth/google.service';
import { ResetTokenService } from './auth/reset-token';
import { ACCESS_TTL_SEC, JwtAuthGuard } from './auth/jwt-auth.guard';
import { OptionalJwtGuard } from './auth/optional-jwt.guard';
import { OnboardingController } from './onboarding/onboarding.controller';
import { OnboardingService } from './onboarding/onboarding.service';
import { TestSettingsController } from './consent/test-settings.controller';
import { TestSettingsService } from './consent/test-settings.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      // The factory runs at init (after loadEnv), so SESSION_SECRET is available.
      useFactory: () => {
        const secret = process.env.SESSION_SECRET;
        if (process.env.NODE_ENV === 'production' && (!secret || secret === 'change-me-in-production')) {
          throw new Error('SESSION_SECRET must be set to a long random string in production');
        }
        return {
          secret: secret || 'dev-insecure-secret',
          signOptions: { expiresIn: ACCESS_TTL_SEC },
        };
      },
    }),
    // The auth routes are rate limited per route (see AuthController).
    ThrottleModule,
  ],
  controllers: [AuthController, OnboardingController, TestSettingsController],
  providers: [
    AuthService,
    SessionService,
    ResetTokenService,
    GoogleService,
    OnboardingService,
    TestSettingsService,
    JwtAuthGuard,
    OptionalJwtGuard,
  ],
  // Exported so other contexts (e.g. Training) can reuse the guard + JwtModule.
  exports: [JwtModule, JwtAuthGuard, OptionalJwtGuard],
})
export class IdentityModule {}
