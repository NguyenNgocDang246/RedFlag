import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { CronController } from './cron.controller';
import { DeliveryConfig } from './delivery.config';
import { DeliveryService } from './delivery.service';
import { InboundController } from './inbound.controller';
import { InboundReportService } from './inbound-report.service';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { SchedulerService } from './scheduler.service';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';

/**
 * Test flow delivery (Phase 4): planning the next test, sending it, and turning the links in it
 * into signals. MailService comes from the global MailModule.
 */
@Module({
  imports: [IdentityModule], // JwtAuthGuard for the report routes
  controllers: [TrackingController, ReportController, InboundController, CronController],
  providers: [DeliveryConfig, SchedulerService, DeliveryService, TrackingService, ReportService, InboundReportService],
  exports: [SchedulerService, DeliveryService],
})
export class DeliveryModule {}
