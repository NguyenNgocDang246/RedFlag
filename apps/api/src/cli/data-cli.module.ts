import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditService } from '../admin/audit.service';
import { BrandAdminService } from '../admin/brand-admin.service';
import { QuizAdminService } from '../admin/quiz-admin.service';
import { TaxonomyService } from '../admin/taxonomy.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Minimal module for the data CLI: DB + admin services only
 * (same publish rules and audit log) — no HTTP, auth or mail.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
  providers: [AuditService, TaxonomyService, QuizAdminService, BrandAdminService],
})
export class DataCliModule {}
