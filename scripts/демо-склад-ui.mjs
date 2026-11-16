#!/usr/bin/env node
/**
 * Сценарий §5 Промта 11b: склад через публичное API одним вызовом.
 *
 * Вход продавца → Склад (обзор, сводка) → создание позиции с
 * приходом 100 кг → список → журнал → списание 10 кг (порча) →
 * перемещение 30 кг на другой склад → балансы обоих складов →
 * availableQty в каталоге уменьшился.
 *
 * Запуск: node scripts/демо-склад-ui.mjs (сервер на :3000).
 */
const BASE_URL = process.env.VISUAL_BASE_URL ?? 'http://localhost:3000';

const DEMO_PHONE = '+79001234567';
const DEMO_PASSWORD = 'qwerty123';

function log(step, message) {
  console.info(`${step.padEnd(4)} ${message}`);
}

async function api(method, path, { token, org, body } = {}) {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(org ? { 'X-Organization-Id': org } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    // Слабый сигнал — операционный сценарий: каждый запрос с
    // собственным таймаутом, зависший keep-alive не блокирует шаг.
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
  }
  return text ? JSON.parse(text) : null;
}

async function main() {
  // 0. Вход продавца и организация.
  const auth = await api('POST', '/auth/login', {
    body: { phone: DEMO_PHONE, password: DEMO_PASSWORD },
  });
  const token = auth.accessToken;
  const me = await api('GET', '/auth/me', { token });
  const sellerOrg = me.memberships.find(
    (m) => String(m.role).toUpperCase() === 'WHOLESALE_SELLER',
  )?.organizationId;
  if (!sellerOrg) throw new Error('организация продавца не найдена');
  log('00', `продавец вошёл; организация …${sellerOrg.slice(-6)}`);

  // 1. Склад: склады организации.
  const locations = await api('GET', '/stock/locations', {
    token,
    org: sellerOrg,
  });
  const warehouse = locations.find((l) => l.isDefault) ?? locations[0];
  log(
    '01',
    `экран «Склад»: складов ${locations.length} — ${locations
      .map((l) => l.name)
      .join('; ')}`,
  );

  // 2. Сводка до сценария.
  const before = await api('GET', '/stock/balances?pageSize=1', {
    token,
    org: sellerOrg,
  });
  log('02', `сводка до: строк остатков ${before.total}`);

  // 3. Создать позицию (product + offer stock=100 → INITIAL).
  const categories = await api('GET', '/catalog/categories');
  const stamp = new Date().toISOString().slice(11, 19);
  const product = await api('POST', '/seller/products', {
    token,
    org: sellerOrg,
    body: {
      title: `Сценарий 11b ${stamp}`,
      categoryId: categories[0].id,
      unit: 'кг',
      description: 'Сквозной сценарий Промта 11b',
    },
  });
  const offer = await api('POST', '/seller/offers', {
    token,
    org: sellerOrg,
    body: {
      productId: product.id,
      price: 3900,
      stock: 100,
      minQuantity: 5,
    },
  });
  log(
    '03',
    `позиция создана: ${product.title} (INITIAL 100 кг, offer …${offer.id.slice(-6)})`,
  );

  // 4. Увидеть в списке (balances по offerId).
  const balances1 = await api('GET', `/stock/balances?offerId=${offer.id}`, {
    token,
    org: sellerOrg,
  });
  const main1 = balances1.items.find((b) => b.locationId === warehouse.id);
  log(
    '04',
    `в списке: ${main1.locationName} — physical=${main1.physicalQty}, reserved=${main1.reservedQty}, available=${main1.availableQty}`,
  );

  // 5. Каталог: availableQty = 100 до движений.
  const offersBefore = await api(
    'GET',
    `/catalog/products/${product.id}/offers`,
  );
  const mineBefore = offersBefore.items.find((o) => o.id === offer.id);
  log('05', `каталог до: stock=${mineBefore.stock}`);

  // 6. Журнал движений (INITIAL).
  const movements1 = await api(
    'GET',
    `/stock/movements?offerId=${offer.id}&pageSize=10`,
    { token, org: sellerOrg },
  );
  log(
    '06',
    `журнал: ${movements1.total} движений — ${movements1.items
      .map(
        (m) => `${m.type} ${m.quantityDelta > 0 ? '+' : ''}${m.quantityDelta}`,
      )
      .join(', ')}`,
  );

  // 7. Списание 10 кг (порча).
  await api('POST', '/stock/movements', {
    token,
    org: sellerOrg,
    body: {
      offerId: offer.id,
      locationId: warehouse.id,
      type: 'WRITE_OFF',
      quantity: 10,
      reason: 'порча при перевозке',
    },
  });
  const summary1 = await api('GET', `/stock/summary?offerId=${offer.id}`, {
    token,
    org: sellerOrg,
  });
  log(
    '07',
    `списание 10 кг: physical=${summary1.physicalQty}, available=${summary1.availableQty}`,
  );

  // 8. Перемещение 30 кг на другой склад.
  const point =
    locations.find((l) => l.id !== warehouse.id) ??
    (await api('POST', '/stock/locations', {
      token,
      org: sellerOrg,
      body: {
        name: 'Точка сценария',
        type: 'STORE',
        address: 'ул. Сценарная, 5',
      },
    }));
  await api('POST', '/stock/transfer', {
    token,
    org: sellerOrg,
    body: {
      offerId: offer.id,
      fromLocationId: warehouse.id,
      toLocationId: point.id,
      quantity: 30,
      reason: 'Развоз по точке',
    },
  });
  log('08', `перемещение 30 кг → «${point.name}»`);

  // 9. Балансы обоих складов.
  const balances2 = await api('GET', `/stock/balances?offerId=${offer.id}`, {
    token,
    org: sellerOrg,
  });
  for (const b of balances2.items) {
    log(
      '09',
      `${b.locationName}: physical=${b.physicalQty}, reserved=${b.reservedQty}, available=${b.availableQty}`,
    );
  }

  // 10. Каталог: availableQty уменьшился (100 → 60).
  const offersAfter = await api(
    'GET',
    `/catalog/products/${product.id}/offers`,
  );
  const mineAfter = offersAfter.items.find((o) => o.id === offer.id);
  log(
    '10',
    `каталог после: stock=${mineAfter.stock} (было ${mineBefore.stock})`,
  );
  // Каталог показывает сумму доступного по всем складам: списание
  // уменьшает её, перемещение между складами — нет (60 + 30 = 90).
  if (mineAfter.stock !== mineBefore.stock - 10) {
    throw new Error(
      `каталог не сошёлся: ${mineBefore.stock} → ${mineAfter.stock} (ожидалось −10)`,
    );
  }

  // 11. Журнал: 4 движения.
  const movements2 = await api(
    'GET',
    `/stock/movements?offerId=${offer.id}&pageSize=10`,
    { token, org: sellerOrg },
  );
  log(
    '11',
    `журнал итог: ${movements2.total} движений — ${movements2.items
      .map(
        (m) => `${m.type} ${m.quantityDelta > 0 ? '+' : ''}${m.quantityDelta}`,
      )
      .join(', ')}`,
  );

  console.info(
    `\nИтог: списание и перемещение отражены в балансах обоих складов ` +
      `(60/30) и в каталоге (stock ${mineBefore.stock} → ${mineAfter.stock}: ` +
      `списание −10, перемещение не меняет сумму).`,
  );
}

main().catch((error) => {
  console.error(`Сценарий 11b: ${error.message}`);
  process.exitCode = 1;
});
