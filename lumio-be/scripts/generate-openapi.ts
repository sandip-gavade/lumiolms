import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

/**
 * Generates openapi.json without binding to a port — this is what lumio-fe should point its
 * client generator at (e.g. openapi-typescript) rather than scraping a live /docs-json
 * endpoint, so the frontend's generated types are pinned to a committed snapshot instead of
 * silently drifting with whatever the backend happens to be running locally.
 */
async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  const config = new DocumentBuilder()
    .setTitle('Lumio LMS API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  writeFileSync(
    join(__dirname, '..', 'openapi.json'),
    JSON.stringify(document, null, 2),
  );
  await app.close();
  process.exit(0);
}
main();
