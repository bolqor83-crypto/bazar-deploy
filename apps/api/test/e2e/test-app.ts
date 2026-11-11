/**
 * Хелпер e2e: приложение с префиксом /api и чистой БД между тестами.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { setupSwagger } from '../../src/swagger';

export interface TestApp {
  app: INestApplication;
  prisma: PrismaService;
  server: ReturnType<INestApplication['getHttpServer']>;
  close: () => Promise<void>;
}

/** Создаёт приложение (роуты под /api, Swagger — как в проде). */
export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  setupSwagger(app);
  await app.init();
  const prisma = app.get(PrismaService);
  return {
    app,
    prisma,
    server: app.getHttpServer(),
    close: async () => {
      await app.close();
    },
  };
}

/** Очистка всех таблиц (каскады уносят членства, сессии, точки). */
export async function clearDatabase(prisma: PrismaService): Promise<void> {
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
}

/** Регистрация через API → пара токенов. */
export async function registerUser(
  server: TestApp['server'],
  phone: string,
  name = 'Тестовый пользователь',
  password = 'qwerty123',
): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
  const response = await request(server)
    .post('/api/auth/register')
    .send({ phone, password, name });
  if (response.status !== 200) {
    throw new Error(
      `register ${phone} → ${response.status}: ${JSON.stringify(response.body)}`,
    );
  }
  return {
    accessToken: response.body.accessToken,
    refreshToken: response.body.refreshToken,
    userId: response.body.user.id,
  };
}
