import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadEnv } from './load-env';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

/**
 * API entrypoint (HTTP). The worker has its own entrypoint (worker.ts) on the same codebase.
 * On Vercel the same app runs as a function instead (serverless.ts).
 */
async function bootstrap() {
  loadEnv();

  // rawBody: the inbound mail webhook verifies its signature over the exact bytes sent.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  configureApp(app);

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);

  Logger.log(`RedFlag API listening on http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
