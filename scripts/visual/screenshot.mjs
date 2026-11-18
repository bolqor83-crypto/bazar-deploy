/**
 * Общий модуль съёмки golden-скриншотов (Промт 9, Часть C).
 *
 * Используется и update-golden.mjs (перезапись), и pixelmatch-check.mjs
 * (сравнение) — идентичный проход гарантирует воспроизводимый дифф.
 *
 * Среда: сервер на http://localhost:3000 (API + статика mobile,
 * ServeStaticModule). Тема — prefers-color-scheme. Аутентификация —
 * реальный логин Ивана (демо-аккаунт из seed).
 *
 * Группировка (Промт 9): guest-записи снимаются в чистом контексте,
 * user-записи — в одном контексте с единственным логином
 * (rate limit auth: 5/мин) и переключением ролей через ContextSheet.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fetchWithRetry, retryReport } from './fetch-retry.mjs';

export const GOLDEN_DIR = path.resolve('docs/visual-golden');
export const BASE_URL = process.env.VISUAL_BASE_URL ?? 'http://localhost:3000';
export const TOLERANCE_PCT = 0.5;

/** Демо-аккаунт из seed (Промт 7). */
const DEMO_PHONE = '+7 (900) 123-45-67';
const DEMO_PASSWORD = 'qwerty123';

/** Вьюпорты из визуальных стандартов (Промт 8). */
export const VIEWPORTS = {
  360: { width: 360, height: 800 },
  390: { width: 390, height: 844 },
  430: { width: 430, height: 932 },
};

/** Русские подписи ролей (ROLE_LABEL в navigation.ts). */
const ROLE_LABELS = {
  customer: 'Покупатель',
  store_owner: 'Владелец точки',
  wholesale_seller: 'Оптовик',
  carrier: 'Перевозчик',
};

/** Маски-селекторы (детерминизация снимка). */
export function maskSelectors() {
  const configPath = path.resolve('scripts/pixelmatch-config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return config.maskSelectors ?? [];
}

/** Подготовка страницы: вьюпорт, тема, отключение анимаций. */
export async function preparePage(context, entry) {
  const page = await context.newPage();
  await setupPage(page, entry);
  return page;
}

/** Настройка существующей страницы под запись (без создания). */
export async function setupPage(page, entry) {
  const vp = VIEWPORTS[entry.viewport] ?? VIEWPORTS[390];
  await page.setViewportSize(vp);
  await page.emulateMedia({
    colorScheme: entry.theme === 'dark' ? 'dark' : 'light',
  });
  return page;
}

/** initScript отключения анимаций — один раз на страницу. */
export async function disableAnimations(page) {
  await page.addInitScript(() => {
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `;
    document.addEventListener('DOMContentLoaded', () => {
      document.head.appendChild(style);
    });
  });
}

/** Применить маски (скрытие динамических зон) перед снимком. */
export async function applyMasks(page) {
  const selectors = maskSelectors();
  if (selectors.length === 0) return;
  const css = selectors
    .map((s) => `${s} { visibility: hidden !important; }`)
    .join('\n');
  await page.addStyleTag({ content: css });
}

/** Открыть URL и дождаться стабильности (networkidle + текст + пауза). */
export async function settle(page, entry) {
  await page.goto(`${BASE_URL}${entry.url}`, { waitUntil: 'networkidle' });
  if (entry.waitForText) {
    await page
      .waitForSelector(`text=${entry.waitForText}`, { timeout: 10_000 })
      .catch(() => {});
  }
  await page.waitForTimeout(500);
}

/** Логин Ивана через форму входа (гидратирует auth-состояние). */
export async function loginAsDemo(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[aria-label="Телефон"]', DEMO_PHONE);
  await page.fill('input[aria-label="Пароль"]', DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  // Пост-логин маршрутизация: приоритет членств — wholesale (ADR 0004).
  await page.waitForURL(/wholesale|store|customer|carrier|welcome/, {
    timeout: 20_000,
  });
  await page.waitForTimeout(800);
}

/** Переключить активную роль через ContextSheet. */
export async function switchRole(page, roleLabel) {
  await page.locator('[aria-label*="Контекст"]').first().click();
  await page
    .getByText('Текущий выбор', { exact: false })
    .waitFor({ timeout: 5000 })
    .catch(() => {});
  await page.waitForTimeout(300);
  const roleChip = page.locator(`[aria-label="${roleLabel}"]`).first();
  await roleChip.click();
  await page.waitForTimeout(300);
  await page.getByText('Применить', { exact: true }).click();
  await page.waitForTimeout(1200);
}

/** Открыть ContextSheet (снимок шита переключения контекста). */
async function openContextSheet(page) {
  await page.locator('[aria-label*="Контекст"]').first().click();
  await page
    .getByText('Текущий выбор', { exact: false })
    .waitFor({ timeout: 5000 })
    .catch(() => {});
  await page.waitForTimeout(600);
}

/** Телефон демо-аккаунта в формате хранения (E.164 без пробелов). */
const DEMO_PHONE_RAW = '+79001234567';

/** POST /auth/login из Node — токен для подготовки состояния.
 *  Промт 14b: через fetchWithRetry — транзиентные 500 от Neon
 *  больше не роняют прогон на этапе логина. */
async function apiLogin() {
  const res = await fetchWithRetry(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: DEMO_PHONE_RAW, password: DEMO_PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`apiLogin: ${res.status} ${await res.text()}`);
  }
  const body = await res.json();
  return body.accessToken;
}

/** Первое предложение первого товара каталога (стабильный выбор seed). */
async function firstOffer(token) {
  const auth = { Authorization: `Bearer ${token}` };
  const productsRes = await fetchWithRetry(
    `${BASE_URL}/api/catalog/products?pageSize=1`,
    { headers: auth },
  );
  if (!productsRes.ok) {
    throw new Error(`products: ${productsRes.status}`);
  }
  const products = await productsRes.json();
  const product = products.items[0];
  const offersRes = await fetchWithRetry(
    `${BASE_URL}/api/catalog/products/${product.id}/offers`,
    { headers: auth },
  );
  if (!offersRes.ok) {
    throw new Error(`offers: ${offersRes.status}`);
  }
  const offers = await offersRes.json();
  return offers.items[0];
}

/**
 * Детерминированное состояние корзины Ивана (Промт 9, Часть C):
 * очистить и положить ровно одну позицию — первого товара каталога
 * ×2 (или minQuantity). Корзина участвует в golden трёх экранов
 * (cart, checkout) и в badge таб-бара на всех экранах покупателя —
 * без сброса каждый прогон CI наследовал бы состояние прошлого.
 */
async function resetDemoCart(token, offer) {
  const auth = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  const clear = await fetchWithRetry(`${BASE_URL}/api/cart`, {
    method: 'DELETE',
    headers: auth,
  });
  if (!clear.ok) {
    throw new Error(`clear cart: ${clear.status}`);
  }
  const quantity = Math.max(2, offer.minQuantity ?? 1);
  const add = await fetchWithRetry(`${BASE_URL}/api/cart/items`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ offerId: offer.id, quantity }),
  });
  if (!add.ok) {
    throw new Error(`add item: ${add.status} ${await add.text()}`);
  }
  return quantity;
}

/** Подготовленный сценарий доставок (id для прямых переходов). */
const prepared = {
  orderId: '',
  orderNumber: '',
  deliveryId: '',
  deliveryNumber: '',
  stockOfferId: '',
};

/** GET-запрос к API с токеном Ивана (с ретраями, Промт 14b). */
async function apiGet(token, path, orgId) {
  const res = await fetchWithRetry(`${BASE_URL}/api${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(orgId ? { 'X-Organization-Id': orgId } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`GET ${path}: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/** POST-запрос к API с токеном Ивана (с ретраями, Промт 14b). */
async function apiPost(token, path, body, orgId) {
  const res = await fetchWithRetry(`${BASE_URL}/api${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(orgId ? { 'X-Organization-Id': orgId } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${path}: ${res.status} ${text.slice(0, 200)}`);
  }
  return JSON.parse(text);
}

/** Прямой доступ к демо-БД (Prisma): детерминированные даты/счётчики. */
async function openPrisma() {
  const { PrismaClient } = await import('@prisma/client');
  const url =
    process.env.DATABASE_URL_POOLED ?? process.env.NEON_DATABASE_URL_POOLED;
  if (url) {
    return new PrismaClient({ datasources: { db: { url } } });
  }
  // Локально: читать apps/api/.env (CI задаёт NEON_*).
  const { readFileSync } = await import('node:fs');
  const env = readFileSync('apps/api/.env', 'utf-8');
  const pooled = env
    .split('\n')
    .find((l) => l.startsWith('DATABASE_URL_POOLED='));
  if (!pooled) throw new Error('нет DATABASE_URL_POOLED');
  return new PrismaClient({
    datasources: { db: { url: pooled.slice('DATABASE_URL_POOLED='.length) } },
  });
}

/** Фиксированные payload'ы сценария (детерминизм пикселей). */
const SCENARIO_ADDRESS = {
  pickupAddress: 'База Опт-Юг, ул. Шоссейная, 4',
  pickupContact: 'Пётр Селиванов, +7 900 555-01-01',
  dropoffAddress: 'Ростов-на-Дону, ул. Большая Садовая, 101',
  dropoffContact: 'Мария Петрова, +7 900 555-02-02',
  weightKg: 60,
  volumeL: 400,
  cargoNotes: 'Ящики, не кантовать',
};
const FIXED_DATES = [
  new Date('2026-11-15T08:30:00Z'),
  new Date('2026-11-15T09:00:00Z'),
  new Date('2026-11-15T09:30:00Z'),
];

/**
 * Детерминированный доступный остаток предложения (Промт 11:
 * баланс + компенсирующее ADJUSTMENT-движение, ADR 0012).
 * Весь остаток — на первом (default) складе, прочие обнулены.
 */
async function ensureOfferBalance(prisma, offerView, target) {
  const balances = await prisma.stockBalance.findMany({
    where: { offerId: offerView.id },
    orderBy: { location: { isDefault: 'desc' } },
  });
  if (balances.length === 0) {
    const location = await prisma.stockLocation.findFirstOrThrow({
      where: { organizationId: offerView.organization.id },
    });
    await prisma.stockMovement.create({
      data: {
        offerId: offerView.id,
        locationId: location.id,
        type: 'INITIAL',
        quantityDelta: target,
        reason: 'Детерминированный остаток для golden-скриншотов',
        refType: 'initial',
        refId: offerView.id,
      },
    });
    await prisma.stockBalance.create({
      data: {
        offerId: offerView.id,
        locationId: location.id,
        physicalQty: target,
        reservedQty: 0,
        availableQty: target,
      },
    });
    return;
  }
  const first = balances[0];
  const current = balances.reduce((sum, b) => sum + b.availableQty, 0);
  if (current !== target) {
    await prisma.stockMovement.create({
      data: {
        offerId: offerView.id,
        locationId: first.locationId,
        type: 'ADJUSTMENT',
        quantityDelta: target - current,
        reason: 'Детерминированный остаток для golden-скриншотов',
        refType: 'manual',
        refId: offerView.id,
      },
    });
  }
  // Весь остаток — на первом складе, резервы сняты (заказы
  // удалены шагом 1), прочие склады обнулены.
  await prisma.stockBalance.update({
    where: {
      offerId_locationId: {
        offerId: offerView.id,
        locationId: first.locationId,
      },
    },
    data: {
      physicalQty: target,
      reservedQty: 0,
      availableQty: target,
    },
  });
  for (const other of balances.slice(1)) {
    await prisma.stockBalance.update({
      where: {
        offerId_locationId: {
          offerId: offerView.id,
          locationId: other.locationId,
        },
      },
      data: { physicalQty: 0, reservedQty: 0, availableQty: 0 },
    });
  }
}

/**
 * Детерминированный сценарий доставок Ивана (Промт 10, Часть D).
 *
 * Пересоздаёт с нуля: 3 подтверждённых заказа (фиксированные даты,
 * номера BZ-2026-000003…000005, остаток восстанавливается через
 * баланс, Промт 11) и 3
 * доставки: PENDING (лента), IN_TRANSIT (мои + карточка заказа),
 * COMPLETED (история с заработком). Уведомления помечаются
 * прочитанными (badge профиля = 0). Прогон CI идемпотентен.
 */
async function prepareDemoDeliveries() {
  // apiLogin может упереться в троттлер (5/мин): один ретрай.
  let token;
  try {
    token = await apiLogin();
  } catch (e) {
    await new Promise((r) => setTimeout(r, 15_000));
    token = await apiLogin();
    void e;
  }
  const prisma = await openPrisma();
  try {
    // 1. Очистить доставки и заказы Ивана, счётчики с нуля.
    //    Промт 11: движения заказов (refType='order') удаляются
    //    вместе с ними — журнал не копит сироты между прогонами CI.
    await prisma.deliveryRequest.deleteMany();
    await prisma.deliveryCounter.deleteMany();
    await prisma.stockMovement.deleteMany({ where: { refType: 'order' } });
    await prisma.order.deleteMany();
    await prisma.orderCounter.update({
      where: { year: new Date().getFullYear() },
      data: { seq: 2 },
    });

    // 2. Организации Ивана (продавец и перевозчик).
    const ivan = await prisma.user.findUnique({
      where: { phone: DEMO_PHONE_RAW },
      select: { id: true },
    });
    if (!ivan) throw new Error('демо-пользователь не найден');
    const wholesale = await prisma.organization.findFirst({
      where: { name: 'Опт-Юг' },
      select: { id: true },
    });
    const logistics = await prisma.organization.findFirst({
      where: { name: 'Транс-Логистик' },
      select: { id: true },
    });
    if (!wholesale || !logistics)
      throw new Error('организации сида не найдены');

    // 3. Фиксированный доступный остаток первого предложения
    //    (Промт 11: баланс + компенсирующее ADJUSTMENT-движение,
    //    ADR 0012 — колонки ProductOffer.stock больше нет).
    const offer = await firstOffer(token);
    const target = Math.max(50, offer.minQuantity ?? 1);
    await ensureOfferBalance(prisma, offer, target);
    const quantity = Math.max(5, offer.minQuantity ?? 1);

    // 4. Три заказа: создать → подтвердить → доставка → статус.
    const deliveries = [];
    for (let i = 0; i < 3; i += 1) {
      const orders = await apiPost(token, '/orders', {
        items: [{ offerId: offer.id, quantity }],
        deliveryMethod: 'pickup',
      });
      const order = orders[0];
      await apiPost(
        token,
        `/seller/orders/${order.id}/confirm`,
        undefined,
        wholesale.id,
      );
      const delivery = await apiPost(token, '/deliveries', {
        orderId: order.id,
        ...SCENARIO_ADDRESS,
      });
      deliveries.push({ order, delivery });

      // Фиксированные даты (текст на карточках заказа стабилен).
      const at = FIXED_DATES[i];
      await prisma.order.update({
        where: { id: order.id },
        data: { createdAt: at, updatedAt: at },
      });
      await prisma.deliveryRequest.update({
        where: { id: delivery.id },
        data: { createdAt: at, updatedAt: at },
      });
    }

    // 5. Статусы доставок: PENDING, IN_TRANSIT, COMPLETED.
    const [pending, active, done] = deliveries;
    const carrierHeaders = logistics.id;
    await apiPost(
      token,
      `/carrier/deliveries/${active.delivery.id}/accept`,
      { price: 150000 },
      carrierHeaders,
    );
    await apiPost(
      token,
      `/carrier/deliveries/${active.delivery.id}/picked-up`,
      undefined,
      carrierHeaders,
    );
    await apiPost(
      token,
      `/carrier/deliveries/${active.delivery.id}/in-transit`,
      undefined,
      carrierHeaders,
    );
    await apiPost(
      token,
      `/carrier/deliveries/${done.delivery.id}/accept`,
      { price: 120000 },
      carrierHeaders,
    );
    await apiPost(
      token,
      `/carrier/deliveries/${done.delivery.id}/picked-up`,
      undefined,
      carrierHeaders,
    );
    await apiPost(
      token,
      `/carrier/deliveries/${done.delivery.id}/in-transit`,
      undefined,
      carrierHeaders,
    );
    await apiPost(
      token,
      `/carrier/deliveries/${done.delivery.id}/delivered`,
      undefined,
      carrierHeaders,
    );
    await apiPost(token, `/deliveries/${done.delivery.id}/complete`);

    // 5.5. Разнообразие списка заказов (Промт 12, итерация 3):
    //     три заказа с разными товарами и статусами. Список из трёх
    //     одинаковых «Бананов» с одной ценой читался как заглушка,
    //     нижняя половина экрана была пуста (VLM-аудит). Даты
    //     фиксированы и НОВЕЕ банановых — разнообразие видно на
    //     первом экране без скролла; пиксели стабильны.
    const catalogPage = await apiGet(
      token,
      '/catalog/products?sort=popular&page=1&pageSize=40',
    );
    const productByName = new Map(catalogPage.items.map((p) => [p.name, p]));
    const offerByName = (name) => {
      const product = productByName.get(name);
      if (!product?.bestOffer) {
        throw new Error(`нет предложения для сценария: ${name}`);
      }
      return product.bestOffer;
    };
    const cucumbersOffer = offerByName('Огурцы гладкие');
    const carrotsOffer = offerByName('Морковь мытая');
    const potatoesOffer = offerByName('Картофель мытый');
    const tomatoesOffer = offerByName('Помидоры розовые');
    const onionsOffer = offerByName('Лук репчатый золотистый');

    // Детерминированные остатки всех товаров сценария: после
    // прошлых прогонов и демо-заказов балансы дрейфуют, заказ
    // «Картофель 40» падал OUT_OF_STOCK (в наличии 39).
    for (const scenarioOffer of [
      cucumbersOffer,
      carrotsOffer,
      potatoesOffer,
      tomatoesOffer,
      onionsOffer,
    ]) {
      await ensureOfferBalance(
        prisma,
        scenarioOffer,
        Math.max(60, scenarioOffer.minQuantity ?? 1),
      );
    }

    const createOrder = (items, extra) =>
      apiPost(token, '/orders', {
        items: items.map(([o, q]) => ({ offerId: o.id, quantity: q })),
        deliveryMethod: extra.method,
        address: extra.address,
        comment: extra.comment,
      });
    const EXTRA_DATES = [
      new Date('2026-11-16T08:00:00Z'),
      new Date('2026-11-15T18:00:00Z'),
      new Date('2026-11-15T14:00:00Z'),
    ];

    // Подтверждённый заказ на два товара.
    const orderConfirmed = (
      await createOrder(
        [
          [cucumbersOffer, 10],
          [carrotsOffer, 15],
        ],
        {
          method: 'delivery',
          address: 'ул. Садовая, 12',
          comment: 'До 10:00, позвонить за час',
        },
      )
    )[0];
    await apiPost(
      token,
      `/seller/orders/${orderConfirmed.id}/confirm`,
      undefined,
      wholesale.id,
    );
    // Завершённый заказ (самовывоз).
    const orderCompleted = (
      await createOrder([[potatoesOffer, 40]], {
        method: 'pickup',
        address: 'Основной склад, ул. Доватора, 45',
        comment: 'Заберём своим транспортом',
      })
    )[0];
    // PENDING → CONFIRMED — без confirm переход в preparing запрещён.
    await apiPost(
      token,
      `/seller/orders/${orderCompleted.id}/confirm`,
      undefined,
      wholesale.id,
    );
    for (const action of ['preparing', 'ready', 'complete']) {
      await apiPost(
        token,
        `/seller/orders/${orderCompleted.id}/${action}`,
        undefined,
        wholesale.id,
      );
    }
    // Отменённый заказ (покупатель).
    const orderCancelled = (
      await createOrder(
        [
          [tomatoesOffer, 8],
          [onionsOffer, 12],
        ],
        {
          method: 'delivery',
          address: 'ул. Садовая, 12',
          comment: 'Ко второй половине дня',
        },
      )
    )[0];
    await apiPost(token, `/orders/${orderCancelled.id}/cancel`);
    // Фиксированные даты для стабильного текста на карточках.
    for (const [order, at] of [
      [orderConfirmed, EXTRA_DATES[0]],
      [orderCompleted, EXTRA_DATES[1]],
      [orderCancelled, EXTRA_DATES[2]],
    ]) {
      await prisma.order.update({
        where: { id: order.id },
        data: { createdAt: at, updatedAt: at },
      });
    }

    // 6. Уведомления сценария — прочитаны (badge профиля = 0).
    await prisma.notification.updateMany({
      where: { readAt: null },
      data: { readAt: new Date() },
    });

    prepared.orderId = active.order.id;
    prepared.orderNumber = active.order.number;
    prepared.deliveryId = active.delivery.id;
    prepared.deliveryNumber = active.delivery.number;
    console.log(
      `подготовка: доставки ${pending.delivery.number} (PENDING), ` +
        `${active.delivery.number} (IN_TRANSIT), ${done.delivery.number} (COMPLETED)`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Детерминированный склад для golden (Промт 11b).
 *
 * Продукт «Голден склад» — постоянный; его предложение пересоздаётся
 * с нуля каждый прогон (без заказов — физическое удаление каскадом
 * уносит движения и балансы, включая баланс точки). Итог всегда:
 * Основной склад 120/0/120, точка 20/0/20, журнал ровно 5 движений
 * (INITIAL 120, RECEIPT +30, WRITE_OFF −10, TRANSFER_OUT −20,
 * TRANSFER_IN +20) с фиксированными причинами.
 */
async function prepareStockGolden(token, sellerOrgId) {
  const productName = 'Голден склад';
  const pointName = 'Точка golden';

  // Продукт: найти активный или создать.
  const products = await apiGet(token, '/seller/products', sellerOrgId);
  let product = products.find((p) => p.title === productName);
  if (!product) {
    const categories = await apiGet(token, '/catalog/categories');
    product = await apiPost(
      token,
      '/seller/products',
      {
        title: productName,
        categoryId: categories[0].id,
        unit: 'кг',
        description: 'Фиксированная позиция для golden-скриншотов склада',
      },
      sellerOrgId,
    );
  }

  // Точка: найти или создать (баланс очистится удалением предложения).
  const locations = await apiGet(token, '/stock/locations', sellerOrgId);
  const defaultLocation = locations.find((l) => l.isDefault) ?? locations[0];
  let point = locations.find((l) => l.name === pointName);
  if (!point) {
    point = await apiPost(
      token,
      '/stock/locations',
      {
        name: pointName,
        type: 'STORE',
        address: 'ул. Эталонная, 1',
      },
      sellerOrgId,
    );
  }

  // Прежние предложения продукта — удалить (без заказов → физически).
  const offers = await apiGet(
    token,
    '/seller/offers?archived=false&pageSize=100',
    sellerOrgId,
  );
  for (const old of offers.items.filter((o) => o.productId === product.id)) {
    await fetchWithRetry(`${BASE_URL}/api/seller/offers/${old.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Organization-Id': sellerOrgId,
      },
    });
  }

  // Свежее предложение с фиксированной историей движений.
  const offer = await apiPost(
    token,
    '/seller/offers',
    {
      productId: product.id,
      price: 4500,
      stock: 120,
      minQuantity: 5,
    },
    sellerOrgId,
  );
  await apiPost(
    token,
    '/stock/movements',
    {
      offerId: offer.id,
      locationId: defaultLocation.id,
      type: 'RECEIPT',
      quantity: 30,
      reason: 'Закупка у фермера',
    },
    sellerOrgId,
  );
  await apiPost(
    token,
    '/stock/movements',
    {
      offerId: offer.id,
      locationId: defaultLocation.id,
      type: 'WRITE_OFF',
      quantity: 10,
      reason: 'порча при перевозке',
    },
    sellerOrgId,
  );
  await apiPost(
    token,
    '/stock/transfer',
    {
      offerId: offer.id,
      fromLocationId: defaultLocation.id,
      toLocationId: point.id,
      quantity: 20,
      reason: 'Развоз по точке',
    },
    sellerOrgId,
  );

  prepared.stockOfferId = offer.id;

  // Фиксированные времена движений (детерминизм + живой вид
  // журнала): раннее утро рабочего дня, разные минуты.
  const prisma = await openPrisma();
  try {
    const day = new Date();
    day.setUTCHours(5, 0, 0, 0);
    const times = [5 * 60, 5 * 60 + 25, 6 * 60 + 10, 6 * 60 + 40, 6 * 60 + 41];
    const movements = await prisma.stockMovement.findMany({
      where: { offerId: offer.id },
      orderBy: { createdAt: 'asc' },
    });
    for (let i = 0; i < movements.length && i < times.length; i += 1) {
      const at = new Date(day);
      at.setUTCMinutes(times[i]);
      await prisma.stockMovement.update({
        where: { id: movements[i].id },
        data: { createdAt: at },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
  console.log(
    `подготовка: склад ${product.title} — основной 120, точка ${point.name} 20 ` +
      `(offer …${offer.id.slice(-6)})`,
  );
}

/**
 * Снять набор записей манифеста. Возвращает { shots, prepFailed }:
 * - shots — Map<name, Buffer PNG>;
 * - prepFailed — Set<name>: кадры, зависящие от подготовки
 *   (заказы/доставки/склад сценария), когда prepare-фаза не
 *   удалась даже после ретраев. Такие кадры пропускаются —
 *   прогон не роняется, остальные кадры снимаются и сверяются
 *   (Промт 14b, закрытие долга о транзиентных 500).
 * Группировка: guest-контекст и user-контекст (один логин на всех).
 */
export async function captureSet(entries) {
  const shots = new Map();
  const prepFailed = new Set();
  const browser = await chromium.launch();
  try {
    // --- Гостевые экраны: чистый контекст. ---
    const guestContext = await browser.newContext({
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    for (const entry of entries) {
      if (entry.authState === 'user') continue;
      const page = await preparePage(guestContext, entry);
      await settle(page, entry);
      await applyMasks(page);
      shots.set(entry.name, await page.screenshot({ fullPage: false }));
      await page.close();
    }
    await guestContext.close();

    // --- Экраны пользователя: один логин, переключение ролей. ---
    const userEntries = entries.filter((e) => e.authState === 'user');
    if (userEntries.length > 0) {
      // Детерминированная корзина Ивана до съёмки: 1 позиция
      // (влияет на cart/checkout golden и badge таб-бара).
      try {
        const token = await apiLogin();
        const offer = await firstOffer(token);
        const quantity = await resetDemoCart(token, offer);
        console.log(
          `подготовка: корзина Ивана = 1 позиция × ${quantity} (${offer.id})`,
        );
      } catch (e) {
        console.warn(`подготовка корзины не удалась: ${e.message}`);
      }
      // Детерминированный сценарий доставок (Промт 10, Часть D):
      // заказы с фиксированными датами и номера DL с нуля.
      // Промт 14b: при неудаче (после ретраев) — не ронять прогон,
      // а пометить зависимые кадры как prep_failed.
      const needsPrepared = userEntries.some(
        (e) => e.openPreparedOrder || e.openPreparedDelivery,
      );
      try {
        await prepareDemoDeliveries();
      } catch (e) {
        if (needsPrepared) {
          for (const entry of userEntries) {
            if (entry.openPreparedOrder || entry.openPreparedDelivery) {
              prepFailed.add(entry.name);
            }
          }
          console.warn(
            `подготовка доставок не удалась (после ретраев): ${e.message} — ` +
              `кадры ${[...prepFailed].join(', ')} помечены prep_failed`,
          );
        } else {
          console.warn(`подготовка доставок не удалась: ${e.message}`);
        }
      }

      // Детерминированный склад golden (Промт 11b): фиксированная
      // позиция с ровно известными остатками и журналом. При неудаче
      // (после ретраев) — зависимые кадры в prep_failed (Промт 14b).
      const needsStock = userEntries.some(
        (e) =>
          e.openStockDetail ||
          e.openStockMovementForm ||
          e.openStockTransferForm ||
          e.stockSearch,
      );
      if (needsStock) {
        try {
          const token = await apiLogin();
          const me = await apiGet(token, '/auth/me');
          const sellerOrg = me.memberships.find(
            (m) => String(m.role).toUpperCase() === 'WHOLESALE_SELLER',
          );
          if (!sellerOrg) {
            throw new Error('у демо-пользователя нет роли WHOLESALE_SELLER');
          }
          await prepareStockGolden(token, sellerOrg.organizationId);
        } catch (e) {
          for (const entry of userEntries) {
            if (
              entry.openStockDetail ||
              entry.openStockMovementForm ||
              entry.openStockTransferForm ||
              entry.stockSearch
            ) {
              prepFailed.add(entry.name);
            }
          }
          console.warn(
            `подготовка склада не удалась (после ретраев): ${e.message} — ` +
              `кадры помечены prep_failed`,
          );
        }
      }

      const userContext = await browser.newContext({
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      });
      // Промт 10, Часть D: refresh-токен на web живёт в sessionStorage
      // (ADR 0011) — он привязан к вкладке. Все экраны пользователя
      // снимаются в ОДНОЙ вкладке: логин и съёмка без закрытия.
      const page = await userContext.newPage();
      await disableAnimations(page);
      await loginAsDemo(page);

      let activeRole = 'wholesale_seller';
      for (const entry of userEntries) {
        // prep_failed: подготовка сценария не удалась — кадр не
        // снимается (снимок был бы 404-заглушкой), остальные идут.
        if (prepFailed.has(entry.name)) {
          console.log(
            `PREP_FAILED ${entry.name}: подготовка не удалась, кадр пропущен`,
          );
          continue;
        }
        await setupPage(page, entry);
        const targetRole = entry.role ?? 'customer';
        if (targetRole !== activeRole) {
          await page
            .goto(`${BASE_URL}/customer/catalog`, { waitUntil: 'networkidle' })
            .catch(() => {});
          await switchRole(page, ROLE_LABELS[targetRole]);
          activeRole = targetRole;
        }
        await settle(page, entry);
        if (entry.openPreparedOrder) {
          // Прямой переход к подготовленному заказу с доставкой.
          await page.goto(`${BASE_URL}/customer/orders/${prepared.orderId}`, {
            waitUntil: 'networkidle',
          });
          await page
            .waitForSelector('[data-testid="order-timeline"]', {
              timeout: 10_000,
            })
            .catch(() => {});
          await page.waitForTimeout(800);
        }
        if (entry.openPreparedDelivery) {
          // Прямой переход к подготовленной доставке (вид перевозчика).
          await page.goto(
            `${BASE_URL}/carrier/deliveries/${prepared.deliveryId}`,
            { waitUntil: 'networkidle' },
          );
          await page
            .waitForSelector('[data-testid="delivery-timeline"]', {
              timeout: 10_000,
            })
            .catch(() => {});
          await page.waitForTimeout(800);
        }
        if (entry.openFirstProduct) {
          const card = page.locator('[data-testid="catalog-product"]').first();
          await card.click();
          // Ждать контент товара (не скелетон): карточка с testID product-card
          // появляется после загрузки данных из API.
          await page
            .waitForSelector('[data-testid="product-card"]', {
              timeout: 10_000,
            })
            .catch(() => {});
          await page.waitForTimeout(600);
          // Промт 14a: карусель похожих товаров обязана быть в кадре —
          // карточка товара с предложами выше фолда на 844px, поэтому
          // дожидаемся карусели и центрируем её по вертикали.
          await page
            .waitForSelector('[data-testid="carousel-scroll"]', {
              timeout: 10_000,
            })
            .catch(() => {});
          await page.evaluate(() => {
            const el = document.querySelector(
              '[data-testid="carousel-scroll"]',
            );
            if (el) {
              el.scrollIntoView({ block: 'center', behavior: 'instant' });
            }
          });
          await page.waitForTimeout(600);
        }
        if (entry.openContextSheet) {
          await openContextSheet(page);
        }
        // Промт 11b: золотые экраны склада оптовика.
        if (entry.stockSearch) {
          // Поиск по товару сужает обзор до фиксированной позиции
          // «Голден склад» (детерминизм списка).
          await page
            .fill('[data-testid="stock-search"]', entry.stockSearch)
            .catch(() => {});
          await page.waitForTimeout(1200);
        }
        if (entry.openStockDetail) {
          await page.goto(
            `${BASE_URL}/wholesale/stock/${prepared.stockOfferId}`,
            { waitUntil: 'networkidle' },
          );
          await page
            .waitForSelector('[data-testid^="movement-"]', { timeout: 10_000 })
            .catch(() => {});
          await page.waitForTimeout(800);
        }
        if (entry.openStockMovementForm) {
          await page.goto(
            `${BASE_URL}/wholesale/stock/${prepared.stockOfferId}/movement?type=RECEIPT`,
            { waitUntil: 'networkidle' },
          );
          await page
            .waitForSelector('[data-testid="movement-save"]', {
              timeout: 10_000,
            })
            .catch(() => {});
          await page.waitForTimeout(800);
        }
        if (entry.openStockTransferForm) {
          await page.goto(
            `${BASE_URL}/wholesale/stock/${prepared.stockOfferId}/transfer`,
            { waitUntil: 'networkidle' },
          );
          await page
            .waitForSelector('[data-testid="transfer-save"]', {
              timeout: 10_000,
            })
            .catch(() => {});
          await page.waitForTimeout(800);
        }
        if (entry.openFirstOrder) {
          // Открыть первый заказ из списка: карточки order-card-<i>.
          // Клик надёжен не везде (медленный CI: гидратация React
          // опаздывает за появлением DOM) — до 3 попыток, успех
          // контролируем сменой URL на /orders/<id>.
          await page
            .waitForSelector('[data-testid^="order-card-"]', {
              timeout: 15_000,
            })
            .catch(() => {});
          let opened = false;
          for (let attempt = 0; attempt < 3 && !opened; attempt += 1) {
            await page
              .locator('[data-testid^="order-card-"]')
              .first()
              .click({ timeout: 5000 })
              .catch(() => {});
            try {
              await page.waitForURL(/\/orders\/[^/]+/, { timeout: 8000 });
              opened = true;
            } catch {
              await page.waitForTimeout(1500);
            }
          }
          await page
            .waitForSelector('[data-testid="order-timeline"]', {
              timeout: 10_000,
            })
            .catch(() => {});
          await page.waitForTimeout(800);
        }
        await applyMasks(page);
        shots.set(entry.name, await page.screenshot({ fullPage: false }));
      }
      await page.close();
      await userContext.close();
    }
  } finally {
    await browser.close();
  }
  // Сводка ретраев — в лог прогона (Промт 14b: наблюдение за
  // частотой 500 в prepare-фазе).
  console.log(retryReport());
  return { shots, prepFailed };
}

/** Прочитать манифест golden-набора. */
export function readManifest() {
  return JSON.parse(
    fs.readFileSync(path.join(GOLDEN_DIR, 'manifest.json'), 'utf8'),
  );
}
