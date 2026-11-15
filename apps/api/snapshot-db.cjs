/**
 * Snapshot БД Bazar перед разрушающими миграциями (Промт 11).
 *
 * pg_dump в песочнице недоступен — скрипт собирает логический дамп
 * средствами Prisma:
 *   1. DDL текущей схемы (prisma migrate diff --from-empty);
 *   2. INSERT-выгрузка данных всех таблиц.
 *
 * Итог: download/промт11a/pre-migration-snapshot.sql — файл, из
 * которого базу можно восстановить на чистом PostgreSQL. Сам файл
 * в репозиторий не попадает (персистентная зона песочницы).
 *
 * Запуск: node snapshot-db.cjs (из apps/api, .env загружен).
 */
const { execSync } = require('node:child_process');
const { writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_DIRECT } },
});

/** Порядок таблиц по зависимостям FK (родители раньше). */
const TABLES = [
  'user',
  'session',
  'organization',
  'membership',
  'businessLocation',
  'category',
  'product',
  'productOffer',
  'offerPriceHistory',
  'stockChange',
  'cart',
  'cartItem',
  'order',
  'orderItem',
  'orderEvent',
  'notification',
  'orderCounter',
  'deliveryRequest',
  'deliveryEvent',
  'deliveryCounter',
];

/** Имя таблицы в PostgreSQL (Prisma: модель без @@map). */
const PSQL_NAMES = {
  user: '"User"',
  session: '"Session"',
  organization: '"Organization"',
  membership: '"Membership"',
  businessLocation: '"BusinessLocation"',
  category: '"Category"',
  product: '"Product"',
  productOffer: '"ProductOffer"',
  offerPriceHistory: '"OfferPriceHistory"',
  stockChange: '"StockChange"',
  cart: '"Cart"',
  cartItem: '"CartItem"',
  order: '"Order"',
  orderItem: '"OrderItem"',
  orderEvent: '"OrderEvent"',
  notification: '"Notification"',
  orderCounter: '"OrderCounter"',
  deliveryRequest: '"DeliveryRequest"',
  deliveryEvent: '"DeliveryEvent"',
  deliveryCounter: '"DeliveryCounter"',
};

/** SQL-литерал значения. */
function sqlValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (value instanceof Date) {
    return `'${value.toISOString()}'::timestamptz`;
  }
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function main() {
  const apiDir = resolve(__dirname);
  const ddl = execSync(
    'npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script',
    { cwd: apiDir, env: { ...process.env }, encoding: 'utf8' },
  );

  const parts = [
    '-- Bazar: snapshot перед миграцией add_stock (Промт 11a).',
    '-- Логический дамп: DDL (prisma migrate diff) + данные (INSERT).',
    '-- Сгенерирован автоматически, восстановление на чистый PostgreSQL.',
    '-- Время снятия: ' + new Date().toISOString(),
    '',
    'BEGIN;',
    '',
    ddl.trim(),
    '',
  ];

  const counts = {};
  for (const table of TABLES) {
    // Модель может быть удалена более поздними миграциями — скип.
    if (!prisma[table]) {
      counts[table] = 'n/a (модель удалена)';
      continue;
    }
    const rows = await prisma[table].findMany();
    counts[table] = rows.length;
    if (rows.length === 0) continue;
    const psql = PSQL_NAMES[table];
    for (const row of rows) {
      const cols = Object.keys(row);
      parts.push(
        `INSERT INTO ${psql} (${cols
          .map((c) => `"${c}"`)
          .join(', ')}) VALUES (${cols
          .map((c) => sqlValue(row[c]))
          .join(', ')});`,
      );
    }
    parts.push('');
  }
  parts.push('COMMIT;', '');

  const out = resolve(
    __dirname,
    '../../../../download/промт11a/pre-migration-snapshot.sql',
  );
  writeFileSync(out, parts.join('\n'), 'utf8');
  process.stdout.write(
    'Snapshot готов: ' + out + '\n' + JSON.stringify(counts, null, 2) + '\n',
  );
}

main()
  .catch((error) => {
    process.stderr.write('Snapshot: ошибка ' + String(error) + '\n');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
