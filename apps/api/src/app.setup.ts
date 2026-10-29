import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { Express } from 'express';
import { ACCESS_COOKIE } from './identity/auth/jwt-auth.guard';

/**
 * Swagger UI at /api/docs (JSON at /api/docs-json). Off in production unless SWAGGER_ENABLED=true,
 * so the admin surface isn't advertised publicly.
 */
function setupSwagger(app: INestApplication): void {
  const enabled =
    process.env.SWAGGER_ENABLED === 'true' || process.env.NODE_ENV !== 'production';
  if (!enabled) return;

  const config = new DocumentBuilder()
    .setTitle('RedFlag API')
    .setVersion('0.0.0')
    .addCookieAuth(ACCESS_COOKIE)
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  // The UI's JS/CSS come from a CDN: on Vercel the function bundle doesn't carry the
  // swagger-ui-dist files the module would otherwise serve from node_modules.
  // Keep the version in step with the swagger-ui-dist that @nestjs/swagger installs.
  const ui = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.32.13';
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'RedFlag API',
    customCssUrl: `${ui}/swagger-ui.css`,
    customJs: [`${ui}/swagger-ui-bundle.js`, `${ui}/swagger-ui-standalone-preset.js`],
  });
}

/** HTTP setup shared by the long-running server (main.ts) and the Vercel function (serverless.ts). */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  // Don't advertise the framework (Express adds `X-Powered-By: Express` by default).
  (app.getHttpAdapter().getInstance() as Express).disable('x-powered-by');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  const webUrl = process.env.WEB_PUBLIC_URL ?? 'http://localhost:4001';
  app.enableCors({ origin: webUrl, credentials: true });

  setupSwagger(app);
}
