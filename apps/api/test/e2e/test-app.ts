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

/**
 * Начальный остаток оффера для e2e (Промт 11): default-склад
 * организации + INITIAL-движение + баланс. Замена прямой записи
 * ProductOffer.stock (колонка удалена, ADR 0012).
 */
export async function seedOfferStock(
  prisma: PrismaService,
  input: { offerId: string; organizationId: string; qty: number },
): Promise<void> {
  let location = await prisma.stockLocation.findFirst({
    where: { organizationId: input.organizationId },
  });
  if (!location) {
    location = await prisma.stockLocation.create({
      data: {
        organizationId: input.organizationId,
        name: 'Основной склад',
        type: 'WAREHOUSE',
        isDefault: true,
      },
    });
  }
  await prisma.stockMovement.create({
    data: {
      offerId: input.offerId,
      locationId: location.id,
      type: 'INITIAL',
      quantityDelta: input.qty,
      reason: 'Начальный остаток (e2e seed)',
      refType: 'initial',
      refId: input.offerId,
    },
  });
  await prisma.stockBalance.create({
    data: {
      offerId: input.offerId,
      locationId: location.id,
      physicalQty: input.qty,
      reservedQty: 0,
      availableQty: input.qty,
    },
  });
}

/** Доступный остаток оффера (сумма по складам) для проверок. */
export async function offerAvailable(
  prisma: PrismaService,
  offerId: string,
): Promise<number> {
  const agg = await prisma.stockBalance.aggregate({
    where: { offerId },
    _sum: { availableQty: true },
  });
  return agg._sum.availableQty ?? 0;
}

/** Очистка всех таблиц (каскады уносят корзины, сессии, точки). */
export async function clearDatabase(prisma: PrismaService): Promise<void> {
  // Склад (Промт 11): движения первыми — FK на офферы/склады
  // без каскада; балансы и склады каскадом с организациями.
  await prisma.stockMovement.deleteMany();
  await prisma.stockBalance.deleteMany();
  await prisma.stockLocation.deleteMany();
  // Доставки первыми: orderId → Order с ON DELETE RESTRICT (события
  // каскадом вместе с заявкой), затем заказы: buyer/seller без
  // onDelete Cascade (заказ живёт дольше участника в предметной
  // области).
  await prisma.deliveryRequest.deleteMany();
  await prisma.deliveryCounter.deleteMany();
  await prisma.order.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.orderCounter.deleteMany();
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
