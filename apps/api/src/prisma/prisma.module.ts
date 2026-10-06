import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * PrismaModule — global để mọi bounded context inject PrismaService.
 * (Tầng persistence adapter dùng chung một kết nối DB — modular monolith.)
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
