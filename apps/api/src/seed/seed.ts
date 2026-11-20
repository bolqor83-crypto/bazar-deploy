/**
 * Seed демо-данных: Иван Петров (Промт 7) + каталог (Промт 8).
 *
 * Воссоздаёт мир моков Промта 3 в реальной БД: один пользователь,
 * четыре организации (опт, две розничные сети, логистика), четыре
 * точки. Пароль qwerty123 — хеш Argon2id, как у реальных паролей.
 * Промт 8 добавил каталог: 6 категорий, 30 товаров, 90 предложений
 * трёх организаций-продавцов (данные — catalog-data.ts).
 *
 * Идемпотентность: если телефон +79001234567 уже есть, а каталог
 * непуст — выход без изменений (безопасно запускать при каждом
 * старте песочницы).
 *
 * Запуск: pnpm --filter @bazar/api seed
 */
import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';
import { SEED_CATEGORIES, SEED_PRODUCTS } from './catalog-data';

const prisma = new PrismaClient({
  // Промт 9, ADR 0010: seed с интерактивными $transaction —
  // только direct-подключение (PgBouncer их не пропускает).
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL_DIRECT ??
        process.env.DATABASE_URL_POOLED ??
        process.env.DATABASE_URL,
    },
  },
});

/** Параметры Argon2id — OWASP, те же, что в приложении. */
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

const IVAN_PHONE = '+79001234567';
const IVAN_NAME = 'Иван Петров';
const IVAN_PASSWORD = 'qwerty123';

/** Мир Ивана из моков Промта 3. */
const ORGANIZATIONS = [
  {
    name: 'Опт-Юг',
    type: 'WHOLESALE',
    role: 'WHOLESALE_SELLER',
    locations: [] as { name: string; address: string; city: string }[],
    // Промт 17, B: позиция на рынке (ряд 1..4, место 1..40).
    // У Опт-Юга нет городских точек — создаём «Точку на рынке».
    market: { row: 3, spot: 12 },
  },
  {
    name: 'Сеть «У дома»',
    type: 'RETAIL',
    role: 'STORE_OWNER',
    locations: [
      {
        name: 'Точка на Садовой',
        address: 'ул. Садовая, 12',
        city: 'Ростов-на-Дону',
        market: { row: 1, spot: 8 },
      },
      {
        name: 'Точка на Доватора',
        address: 'ул. Доватора, 45',
        city: 'Ростов-на-Дону',
      },
      {
        name: 'Точка в Аксае',
        address: 'г. Аксай, пр. Ленина, 3',
        city: 'Аксай',
      },
    ],
  },
  {
    name: 'Магазин «Ромашка»',
    type: 'RETAIL',
    role: 'STORE_OWNER',
    locations: [
      {
        name: 'Ромашка — главный зал',
        address: 'ул. Большая Садовая, 101',
        city: 'Ростов-на-Дону',
        market: { row: 2, spot: 27 },
      },
    ],
  },
  {
    name: 'Транс-Логистик',
    type: 'LOGISTICS',
    role: 'CARRIER',
    locations: [] as { name: string; address: string; city: string }[],
    // Логистика на рынке не торгует — позиции нет (ADR 0017).
  },
] as const;

async function seed(): Promise<void> {
  const existing = await prisma.user.findUnique({
    where: { phone: IVAN_PHONE },
  });
  if (existing) {
    process.stdout.write('Seed: Иван Петров уже в БД — пропуск\n');
  } else {
    await seedIvan();
  }
  await seedCatalog();
}

/** Мир Ивана: пользователь, 4 организации, 4 точки. */
async function seedIvan(): Promise<void> {
  const passwordHash = await hash(IVAN_PASSWORD, ARGON2_OPTIONS);

  await prisma.$transaction(
    async (tx) => {
      const ivan = await tx.user.create({
        data: {
          phone: IVAN_PHONE,
          name: IVAN_NAME,
          passwordHash,
        },
      });

      for (const org of ORGANIZATIONS) {
        const organization = await tx.organization.create({
          data: {
            name: org.name,
            type: org.type,
            memberships: {
              create: { userId: ivan.id, role: org.role },
            },
          },
        });
        // Промт 11: каждой организации — default-склад.
        await tx.stockLocation.create({
          data: {
            organizationId: organization.id,
            name: 'Основной склад',
            type: 'WAREHOUSE',
            isDefault: true,
          },
        });
        for (const loc of org.locations) {
          await tx.businessLocation.create({
            data: {
              organizationId: organization.id,
              name: loc.name,
              address: loc.address,
              city: loc.city,
              marketRow: 'market' in loc ? loc.market.row : null,
              marketSpot: 'market' in loc ? loc.market.spot : null,
            },
          });
        }
        // Промт 17, B: у Опт-Юга нет городских точек — его место
        // на рынке получает отдельная «Точка на рынке».
        if (org.locations.length === 0 && 'market' in org && org.market) {
          await tx.businessLocation.create({
            data: {
              organizationId: organization.id,
              name: 'Точка на рынке',
              address: 'Центральный рынок',
              city: 'Ростов-на-Дону',
              marketRow: org.market.row,
              marketSpot: org.market.spot,
            },
          });
        }
      }
    },
    // Neon: холодный старт compute — щедрый таймаут.
    { timeout: 120_000, maxWait: 20_000 },
  );

  process.stdout.write(
    'Seed: Иван Петров создан — 4 организации, 4 точки, пароль qwerty123\n',
  );
}

/** Каталог: 6 категорий, 30 товаров, предложения трёх продавцов. */
async function seedCatalog(): Promise<void> {
  const categoryCount = await prisma.category.count();
  if (categoryCount > 0) {
    process.stdout.write(
      `Seed: каталог уже в БД (${categoryCount} категорий) — пропуск\n`,
    );
    return;
  }

  // Продавцы ищем по имени — их создал seedIvan (или они уже были).
  const sellers = await prisma.organization.findMany({
    include: { stockLocations: { where: { isDefault: true } } },
  });
  const orgByName = new Map(sellers.map((org) => [org.name, org]));

  await prisma.$transaction(
    async (tx) => {
      const categoryIds = new Map<string, string>();
      for (const category of SEED_CATEGORIES) {
        const created = await tx.category.create({
          data: {
            slug: category.slug,
            name: category.name,
            icon: category.icon,
            sortOrder: category.sortOrder,
          },
        });
        categoryIds.set(category.slug, created.id);
      }

      for (const product of SEED_PRODUCTS) {
        const created = await tx.product.create({
          data: {
            categoryId: categoryIds.get(product.category) as string,
            name: product.name,
            unit: product.unit,
            description: product.description,
            images: JSON.stringify(product.images),
          },
        });
        for (const offer of product.offers) {
          const org = orgByName.get(offer.organization);
          if (!org) {
            throw new Error(
              `Seed: организация «${offer.organization}» не найдена`,
            );
          }
          // Промт 11: остаток оффера — INITIAL-движение + баланс на
          // default-складе организации (лениво, если склада нет).
          let locationId = org.stockLocations[0]?.id;
          if (!locationId) {
            locationId = (
              await tx.stockLocation.create({
                data: {
                  organizationId: org.id,
                  name: 'Основной склад',
                  type: 'WAREHOUSE',
                  isDefault: true,
                },
              })
            ).id;
          }
          const createdOffer = await tx.productOffer.create({
            data: {
              productId: created.id,
              organizationId: org.id,
              priceKopecks: offer.priceKopecks,
              minQuantity: offer.minQuantity,
              badge: offer.badge,
              isPerishable: offer.isPerishable,
            },
          });
          if (offer.stock > 0) {
            await tx.stockMovement.create({
              data: {
                offerId: createdOffer.id,
                locationId,
                type: 'INITIAL',
                quantityDelta: offer.stock,
                reason: 'Начальный остаток (seed)',
                refType: 'initial',
                refId: createdOffer.id,
              },
            });
            await tx.stockBalance.create({
              data: {
                offerId: createdOffer.id,
                locationId,
                physicalQty: offer.stock,
                reservedQty: 0,
                availableQty: offer.stock,
              },
            });
          }
        }
      }
    },
    // 90 предложений подряд — одна транзакция с запасом на сеть.
    { timeout: 180_000, maxWait: 20_000 },
  );

  const products = await prisma.product.count();
  const offers = await prisma.productOffer.count();
  process.stdout.write(
    `Seed: каталог создан — ${SEED_CATEGORIES.length} категорий, ${products} товаров, ${offers} предложений\n`,
  );
}

seed()
  .catch((error: unknown) => {
    process.stderr.write(`Seed: ошибка ${String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
