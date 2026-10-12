import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AuditService } from './audit.service';
import { BrandAdminService } from './brand-admin.service';
import { QuizAdminService } from './quiz-admin.service';
import { TaxonomyService } from './taxonomy.service';

@Module({
  imports: [IdentityModule], // JwtModule cho AdminGuard
  controllers: [AdminController],
  providers: [
    AdminGuard,
    AuditService,
    TaxonomyService,
    QuizAdminService,
    BrandAdminService,
  ],
})
export class AdminModule {}
