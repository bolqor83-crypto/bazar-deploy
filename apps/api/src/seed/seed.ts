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

const prisma = new PrismaClient();

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
      },
    ],
  },
  {
    name: 'Транс-Логистик',
    type: 'LOGISTICS',
    role: 'CARRIER',
    locations: [] as { name: string; address: string; city: string }[],
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

  await prisma.$transaction(async (tx) => {
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
      for (const loc of org.locations) {
        await tx.businessLocation.create({
          data: {
            organizationId: organization.id,
            name: loc.name,
            address: loc.address,
            city: loc.city,
          },
        });
      }
    }
  });

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
  const sellers = await prisma.organization.findMany();
  const orgByName = new Map(sellers.map((org) => [org.name, org.id]));

  await prisma.$transaction(async (tx) => {
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
        const organizationId = orgByName.get(offer.organization);
        if (!organizationId) {
          throw new Error(
            `Seed: организация «${offer.organization}» не найдена`,
          );
        }
        await tx.productOffer.create({
          data: {
            productId: created.id,
            organizationId,
            priceKopecks: offer.priceKopecks,
            stock: offer.stock,
            minQuantity: offer.minQuantity,
            badge: offer.badge,
            isPerishable: offer.isPerishable,
          },
        });
      }
    }
  });

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
