import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { HealthModule } from './health/health.module';
import { CatalogModule } from './catalog/catalog.module';
import { IdentityModule } from './identity/identity.module';

/**
 * AppModule — gốc của modular monolith (xem plan/architecture.md §4).
 * Các bounded context được thêm dưới dạng module theo từng Phase.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MailModule,
    HealthModule,
    CatalogModule,
    IdentityModule,
  ],
})
export class AppModule {}
