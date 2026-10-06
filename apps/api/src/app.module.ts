import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { CatalogModule } from './catalog/catalog.module';

/**
 * AppModule — gốc của modular monolith (xem plan/architecture.md §4).
 * Các bounded context (identity, catalog, training, testing, delivery,
 * tracking, scoring) sẽ được thêm dưới dạng module ở các Phase sau.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    CatalogModule,
  ],
})
export class AppModule {}
