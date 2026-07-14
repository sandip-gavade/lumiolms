import { join } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true keeps the unparsed request buffer available as req.rawBody alongside the
  // normal parsed JSON body — needed to verify the Stripe webhook signature, which is
  // computed over the exact raw bytes Stripe sent (see StripeWebhookController).
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();
  // Serves StorageService's local-disk dev fallback (certificates, etc.) — see
  // common/storage.service.ts. Not used once real GCS storage replaces it.
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/static' });

  // Not mounted in production — an interactive schema explorer isn't something to expose
  // publicly, and lumio-fe should be generating its client from the committed OpenAPI JSON
  // (`npm run docs:json`, see package.json), not calling this endpoint at runtime.
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Lumio LMS API')
      .setDescription(
        'Every route except /auth/* and the public catalog GETs requires a Bearer access ' +
          'token. Tenant resolution: authenticated requests take tenantId from the token; ' +
          'anonymous requests resolve it from the subdomain, or from an `x-tenant-id` header ' +
          'carrying the tenant UUID directly for local dev — see TenantContextMiddleware.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
