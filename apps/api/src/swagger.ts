/**
 * Инициализация OpenAPI (Swagger): /api/docs + /api/docs-json.
 *
 * Выносится из main.ts, чтобы e2e-тесты проверяли спеку того же
 * приложения, что и прод.
 */
import { type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { version as pkgVersion } from '../package.json';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Bazar API')
    .setDescription(
      'Фундамент бэкенда Bazar: аутентификация (Argon2id + JWT + refresh family), ' +
        'организации, точки. Промт 7.',
    )
    .setVersion(pkgVersion)
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
    swaggerOptions: { persistAuthorization: true },
  });
}
