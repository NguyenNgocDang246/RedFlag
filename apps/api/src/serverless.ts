import 'reflect-metadata';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { NestFactory } from '@nestjs/core';
import { loadEnv } from './load-env';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

/** Built once per function instance and reused by every request it serves. */
let server: Promise<Handler> | undefined;

async function bootstrap(): Promise<Handler> {
  loadEnv();
  // rawBody: the inbound mail webhook verifies its signature over the exact bytes sent.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  configureApp(app);
  await app.init();
  return app.getHttpAdapter().getInstance() as Handler;
}

/** Vercel function entry (apps/api/api/index.js): the whole API behind one handler. */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  server ??= bootstrap();
  (await server)(req, res);
}
