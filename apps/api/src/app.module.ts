import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';

/**
 * AppModule — gốc của modular monolith (xem plan/architecture.md §4).
 * Các bounded context (identity, catalog, training, testing, delivery,
 * tracking, scoring) sẽ được thêm dưới dạng module ở các Phase sau.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
  ],
})
export class AppModule {}
