#!/usr/bin/env node
/**
 * Демо-флоу склада (Промт 11a): event-sourced остатки сквозным
 * сценарием через публичное API.
 *
 * Сценарий: вход Ивана → склады организации → продавец создаёт
 * товар и предложение (INITIAL) → остатки/сводка → приход (RECEIPT)
 * → перемещение на точку (TRANSFER) → покупатель заказывает
 * (RESERVED) → продавец подтверждает (SALE_OUT + UNRESERVED) →
 * покупатель отменяет PENDING-заказ (UNRESERVED) → отмена
 * CONFIRMED-заказа (RETURN_IN) → журнал движений.
 *
 * Запуск: node scripts/демо-склад.mjs (сервер на :3000 должен быть
 * поднят; BASE — публичный URL или localhost).
 */
const BASE_URL = process.env.VISUAL_BASE_URL ?? 'http://localhost:3000';

const DEMO_PHONE = '+79001234567';
const DEMO_PASSWORD = 'qwerty123';

/** Лог шага. */
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
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
  }
  return text ? JSON.parse(text) : null;
}

async function main() {
  // 0. Вход Ивана и организация продавца.
  const auth = await api('POST', '/auth/login', {
    body: { phone: DEMO_PHONE, password: DEMO_PASSWORD },
  });
  const token = auth.accessToken;
  const me = await api('GET', '/auth/me', { token });
  const sellerOrg = me.memberships.find(
    (m) => m.role?.toUpperCase() === 'WHOLESALE_SELLER',
  )?.organizationId;
  if (!sellerOrg) throw new Error('организация продавца не найдена');
  log('00', `Иван вошёл; организация продавца …${sellerOrg.slice(-6)}`);

  // 1. Склады организации (default создан миграцией add_stock).
  const locations = await api('GET', '/stock/locations', {
    token,
    org: sellerOrg,
  });
  const warehouse = locations.find((l) => l.isDefault) ?? locations[0];
  log(
    '01',
    `склады организации: ${locations
      .map((l) => `${l.name} (${l.type}${l.isDefault ? ', default' : ''})`)
      .join('; ')}`,
  );

  // 2. Товар и предложение (stock=100 → INITIAL-движение).
  const categories = await api('GET', '/catalog/categories');
  const offer = await api('POST', '/seller/offers', {
    token,
    org: sellerOrg,
    body: {
      productId: (
        await api('POST', '/seller/products', {
          token,
          org: sellerOrg,
          body: {
            title: `Демо склада ${new Date().toISOString().slice(11, 19)}`,
            categoryId: categories[0].id,
            unit: 'кг',
            description: 'Сквозной сценарий Промта 11a',
          },
        })
      ).id,
      price: 4500,
      stock: 100,
      minQuantity: 5,
    },
  });
  log('02', `предложение создано: ${offer.id} (INITIAL 100 ед.)`);

  // 3. Остатки и сводка.
  const balances = await api('GET', `/stock/balances?offerId=${offer.id}`, {
    token,
    org: sellerOrg,
  });
  log(
    '03',
    `баланс: physical=${balances.items[0].physicalQty}, ` +
      `reserved=${balances.items[0].reservedQty}, ` +
      `available=${balances.items[0].availableQty} ` +
      `(${balances.items[0].locationName})`,
  );

  // 4. Приход 50 ед. (RECEIPT).
  await api('POST', '/stock/movements', {
    token,
    org: sellerOrg,
    body: {
      offerId: offer.id,
      type: 'RECEIPT',
      quantity: 50,
      reason: 'Закупка у фермера',
    },
  });
  log('04', 'приход +50 (RECEIPT)');

  // 5. Перемещение 30 ед. на новую точку (TRANSFER_OUT/IN).
  const store = await api('POST', '/stock/locations', {
    token,
    org: sellerOrg,
    body: { name: 'Демо-точка', type: 'STORE', address: 'ул. Пример, 1' },
  });
  await api('POST', '/stock/transfer', {
    token,
    org: sellerOrg,
    body: {
      offerId: offer.id,
      fromLocationId: warehouse.id,
      toLocationId: store.id,
      quantity: 30,
      reason: 'Развоз по точке',
    },
  });
  const summary1 = await api('GET', `/stock/summary?offerId=${offer.id}`, {
    token,
    org: sellerOrg,
  });
  log(
    '05',
    `перемещение 30 → точка; сводка: physical=${summary1.physicalQty}, ` +
      `available=${summary1.availableQty}, складов=${summary1.locationsCount}`,
  );

  // 6. Покупатель и заказ №1 (RESERVED).
  const buyer = await api('POST', '/auth/register', {
    body: {
      phone: '+79007778899',
      password: 'qwerty123',
      name: 'Покупатель склада',
    },
  });
  const order1 = (
    await api('POST', '/orders', {
      token: buyer.accessToken,
      body: {
        items: [{ offerId: offer.id, quantity: 20 }],
        deliveryMethod: 'pickup',
      },
    })
  )[0];
  const summary2 = await api('GET', `/stock/summary?offerId=${offer.id}`, {
    token,
    org: sellerOrg,
  });
  log(
    '06',
    `заказ ${order1.number}: RESERVED 20 → ` +
      `physical=${summary2.physicalQty}, reserved=${summary2.reservedQty}, ` +
      `available=${summary2.availableQty}`,
  );

  // 7. Подтверждение продавцом (SALE_OUT + UNRESERVED).
  await api('POST', `/seller/orders/${order1.id}/confirm`, {
    token,
    org: sellerOrg,
  });
  const summary3 = await api('GET', `/stock/summary?offerId=${offer.id}`, {
    token,
    org: sellerOrg,
  });
  log(
    '07',
    `подтверждение: SALE_OUT 20 → physical=${summary3.physicalQty}, ` +
      `reserved=${summary3.reservedQty}, available=${summary3.availableQty}`,
  );

  // 8. Заказ №2 и отмена покупателем из PENDING (UNRESERVED).
  const order2 = (
    await api('POST', '/orders', {
      token: buyer.accessToken,
      body: {
        items: [{ offerId: offer.id, quantity: 10 }],
        deliveryMethod: 'pickup',
      },
    })
  )[0];
  const summary4 = await api('GET', `/stock/summary?offerId=${offer.id}`, {
    token,
    org: sellerOrg,
  });
  log(
    '08',
    `заказ ${order2.number}: RESERVED 10 → available=${summary4.availableQty}`,
  );
  await api('POST', `/orders/${order2.id}/cancel`, {
    token: buyer.accessToken,
  });
  const summary5 = await api('GET', `/stock/summary?offerId=${offer.id}`, {
    token,
    org: sellerOrg,
  });
  log(
    '09',
    `отмена PENDING: UNRESERVED 10 → available=${summary5.availableQty}`,
  );

  // 9. Отмена подтверждённого заказа №1 (RETURN_IN).
  await api('POST', `/orders/${order1.id}/cancel`, {
    token: buyer.accessToken,
  });
  const summary6 = await api('GET', `/stock/summary?offerId=${offer.id}`, {
    token,
    org: sellerOrg,
  });
  log(
    '10',
    `отмена CONFIRMED: RETURN_IN 20 → physical=${summary6.physicalQty}, ` +
      `available=${summary6.availableQty}`,
  );

  // 10. Журнал движений предложения.
  const movements = await api(
    'GET',
    `/stock/movements?offerId=${offer.id}&pageSize=50`,
    { token, org: sellerOrg },
  );
  console.info('11   журнал движений:');
  for (const m of [...movements.items].reverse()) {
    const delta = `${m.quantityDelta >= 0 ? '+' : ''}${m.quantityDelta}`;
    console.info(
      `     ${m.type.padEnd(12)} ${delta.padEnd(5)} ${m.reason} (${m.locationName})`,
    );
  }
  console.info(
    `\nИтог: ${movements.total} движений; остаток ` +
      `${summary6.physicalQty}/${summary6.reservedQty}/${summary6.availableQty} ` +
      `(physical/reserved/available) на ${summary6.locationsCount} складах.`,
  );
}

main().catch((error) => {
  console.error(`Демо склада: ${error.message}`);
  process.exitCode = 1;
});
