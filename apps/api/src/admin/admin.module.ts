import { Module } from '@nestjs/common';
import { DeliveryModule } from '../delivery/delivery.module';
import { IdentityModule } from '../identity/identity.module';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AuditService } from './audit.service';
import { BrandAdminService } from './brand-admin.service';
import { QuizAdminService } from './quiz-admin.service';
import { TaxonomyService } from './taxonomy.service';
import { TestEmailAdminService } from './test-email-admin.service';

@Module({
  imports: [IdentityModule, DeliveryModule], // JwtModule cho AdminGuard; DeliveryModule để gửi thử
  controllers: [AdminController],
  providers: [
    AdminGuard,
    AuditService,
    TaxonomyService,
    QuizAdminService,
    BrandAdminService,
    TestEmailAdminService,
  ],
})
export class AdminModule {}
