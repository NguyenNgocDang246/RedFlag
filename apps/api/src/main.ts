import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { loadEnv } from './load-env';
import { AppModule } from './app.module';

/**
 * API entrypoint (HTTP). Worker chạy bằng entrypoint riêng (worker.ts)
 * nhưng dùng chung codebase — đặc trưng modular monolith.
 */
async function bootstrap() {
  loadEnv();

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  const webUrl = process.env.WEB_PUBLIC_URL ?? 'http://localhost:3000';
  app.enableCors({ origin: webUrl, credentials: true });

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);

  Logger.log(`PhishGym API listening on http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
