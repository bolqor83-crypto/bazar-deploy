#!/usr/bin/env node
/**
 * Сквозной сценарий Промта 10, Часть D: полный цикл заказа с доставкой.
 *
 * Иван последовательно выступает всеми сторонами рынка:
 *   продавец (Опт-Юг) создаёт товар и предложение →
 *   покупатель берёт товар в корзину и оформляет заказ →
 *   продавец ведёт заказ confirm → preparing → ready →
 *   покупатель оформляет заявку на доставку →
 *   перевозчик (Транс-Логистик) принимает рейс со ставкой и ведёт
 *   его: забрал → в пути → доставил →
 *   покупатель подтверждает получение (complete).
 *
 * Запуск: node scripts/демо-доставка.mjs (сервер на :3000).
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
  // 0. Вход Ивана и его организации.
  const auth = await api('POST', '/auth/login', {
    body: { phone: DEMO_PHONE, password: DEMO_PASSWORD },
  });
  const token = auth.accessToken;
  const me = await api('GET', '/auth/me', { token });
  // /auth/me отдаёт роли в нижнем регистре (kind-формат клиента).
  const sellerOrg = me.memberships.find(
    (m) => m.role?.toUpperCase() === 'WHOLESALE_SELLER',
  )?.organizationId;
  const carrierOrg = me.memberships.find(
    (m) => m.role?.toUpperCase() === 'CARRIER',
  )?.organizationId;
  if (!sellerOrg || !carrierOrg) throw new Error('организации не найдены');
  log(
    '00',
    `Иван вошёл; продавец=${sellerOrg.slice(-6)}, перевозчик=${carrierOrg.slice(-6)}`,
  );

  // 1. Продавец создаёт товар и предложение.
  const categories = await api('GET', '/catalog/categories', { token });
  const category = categories[0];
  const product = await api('POST', '/seller/products', {
    token,
    org: sellerOrg,
    body: {
      title: `Мандарины Eldorado (${new Date().toISOString().slice(11, 19)})`,
      subtitle: 'Грузия, высший сорт',
      description: 'Сладкие мандарины, ящик 10 кг',
      categoryId: category.id,
      unit: 'ящик',
    },
  });
  const offer = await api('POST', '/seller/offers', {
    token,
    org: sellerOrg,
    body: {
      productId: product.id,
      price: 24_500,
      stock: 40,
      minQuantity: 1,
    },
  });
  log(
    '01',
    `продавец: товар «${product.title}», предложение ${offer.price / 100} ₽/ящик, склад ${offer.stock}`,
  );

  // 2. Покупатель находит товар в каталоге и кладёт в корзину.
  const search = await api(
    'GET',
    `/catalog/products?search=${encodeURIComponent('Мандарины')}&pageSize=50`,
    { token },
  );
  const found = search.items.find((p) => p.id === product.id);
  if (!found) throw new Error('товар не нашёлся в каталоге');
  await api('DELETE', '/cart', { token });
  await api('POST', '/cart/items', {
    token,
    body: { offerId: offer.id, quantity: 3 },
  });
  log('02', `покупатель: корзина — 3 ящика мандаринов`);

  // 3. Покупатель оформляет заказ (самовывоз).
  const orders = await api('POST', '/orders', {
    token,
    body: {
      items: [{ offerId: offer.id, quantity: 3 }],
      deliveryMethod: 'pickup',
    },
  });
  const order = orders[0];
  log(
    '03',
    `покупатель: заказ ${order.number} на ${order.total / 100} ₽ (PENDING)`,
  );

  // 4. Продавец ведёт заказ: confirm → preparing → ready.
  for (const action of ['confirm', 'preparing', 'ready']) {
    const updated = await api('POST', `/seller/orders/${order.id}/${action}`, {
      token,
      org: sellerOrg,
    });
    log('04', `продавец: ${order.number} → ${updated.status}`);
  }

  // 5. Покупатель оформляет заявку на доставку.
  const delivery = await api('POST', '/deliveries', {
    token,
    body: {
      orderId: order.id,
      pickupAddress: 'База Опт-Юг, ул. Шоссейная, 4',
      pickupContact: 'Пётр Селиванов, +7 900 555-01-01',
      dropoffAddress: 'Ростов-на-Дону, ул. Большая Садовая, 101',
      dropoffContact: 'Мария Петрова, +7 900 555-02-02',
      weightKg: 30,
      volumeL: 180,
      cargoNotes: '3 ящика мандаринов, беречь от мороза',
    },
  });
  log(
    '05',
    `покупатель: заявка ${delivery.number} (${delivery.status}) по заказу ${order.number}`,
  );

  // 6. Перевозчик принимает рейс и ведёт его до доставки.
  const accepted = await api(
    'POST',
    `/carrier/deliveries/${delivery.id}/accept`,
    {
      token,
      org: carrierOrg,
      body: { price: 90000 },
    },
  );
  log(
    '06',
    `перевозчик: принял ${accepted.number} за ${accepted.price / 100} ₽ (${accepted.carrierName})`,
  );
  for (const action of ['picked-up', 'in-transit', 'delivered']) {
    const updated = await api(
      'POST',
      `/carrier/deliveries/${delivery.id}/${action}`,
      {
        token,
        org: carrierOrg,
      },
    );
    log('06', `перевозчик: ${updated.number} → ${updated.status}`);
  }

  // 7. Покупатель подтверждает получение.
  const completed = await api('POST', `/deliveries/${delivery.id}/complete`, {
    token,
  });
  log('07', `покупатель: ${completed.number} → ${completed.status}`);

  // 8. Итоги: события рейса и уведомления участников.
  const detail = await api('GET', `/deliveries/${delivery.id}`, { token });
  log('08', `события: ${detail.events.map((e) => e.type).join(' → ')}`);
  const notifications = await api('GET', '/notifications?unread=true', {
    token,
  });
  const byType = {};
  for (const n of notifications.items) {
    byType[n.type] = (byType[n.type] ?? 0) + 1;
  }
  log('08', `непрочитанные уведомления: ${JSON.stringify(byType)}`);

  console.info(
    `\nСценарий завершён: заказ ${order.number} доставлен рейсом ` +
      `${completed.number} (ставка ${completed.price / 100} ₽), ` +
      `${detail.events.length} событий, статус ${completed.status}.`,
  );
}

main().catch((e) => {
  console.error('СЦЕНАРИЙ ПАЛ:', e.message);
  process.exit(1);
});
