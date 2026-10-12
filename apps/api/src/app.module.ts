import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { HealthModule } from './health/health.module';
import { IdentityModule } from './identity/identity.module';
import { TrainingModule } from './training/training.module';
import { AdminModule } from './admin/admin.module';
import { ThrottleModule } from './throttle/throttle.module';
import { ContestModule } from './contest/contest.module';
import { ProgressModule } from './progress/progress.module';
import { DeliveryModule } from './delivery/delivery.module';

/**
 * AppModule — root of the modular monolith (see plan/architecture.md §4).
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MailModule,
    HealthModule,
    IdentityModule,
    TrainingModule,
    ContestModule,
    ProgressModule,
    DeliveryModule,
    AdminModule,
    ThrottleModule,
  ],
})
export class AppModule {}
