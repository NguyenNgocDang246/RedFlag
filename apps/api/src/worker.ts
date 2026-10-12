import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadEnv } from './load-env';
import { AppModule } from './app.module';

/**
 * Worker entrypoint — background process (scheduler + queue consumers).
 * Phase 0: boots the app context only (BullMQ arrives in Phase 4).
 * Separate process so background jobs don't affect API latency (R8).
 */
async function bootstrap() {
  loadEnv();

  const app = await NestFactory.createApplicationContext(AppModule);
  await app.init();

  Logger.log('RedFlag worker started (idle — queues arrive in Phase 4)', 'Worker');

  const shutdown = async (signal: string) => {
    Logger.log(`Received ${signal}, shutting down worker`, 'Worker');
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void bootstrap();
