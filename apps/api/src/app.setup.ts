import { type INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

/** HTTP setup shared by the long-running server (main.ts) and the Vercel function (serverless.ts). */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  const webUrl = process.env.WEB_PUBLIC_URL ?? 'http://localhost:4001';
  app.enableCors({ origin: webUrl, credentials: true });
}
