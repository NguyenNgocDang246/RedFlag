import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { loadEnv } from './load-env';
import { AppModule } from './app.module';

/**
 * API entrypoint (HTTP). The worker has its own entrypoint (worker.ts) on the same codebase.
 */
async function bootstrap() {
  loadEnv();

  // rawBody: the inbound mail webhook verifies its signature over the exact bytes sent.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  const webUrl = process.env.WEB_PUBLIC_URL ?? 'http://localhost:4001';
  app.enableCors({ origin: webUrl, credentials: true });

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);

  Logger.log(`RedFlag API listening on http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
