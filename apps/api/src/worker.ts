import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadEnv } from './load-env';
import { AppModule } from './app.module';

/**
 * Worker entrypoint — tiến trình nền (scheduler + queue consumers).
 * Phase 0: chỉ boot application context (chưa có queue; BullMQ thêm ở Phase 4).
 * Tách tiến trình để job nền không ảnh hưởng độ trễ API (R8).
 */
async function bootstrap() {
  loadEnv();

  const app = await NestFactory.createApplicationContext(AppModule);
  await app.init();

  Logger.log('PhishGym worker started (idle — queues arrive in Phase 4)', 'Worker');

  const shutdown = async (signal: string) => {
    Logger.log(`Received ${signal}, shutting down worker`, 'Worker');
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void bootstrap();
