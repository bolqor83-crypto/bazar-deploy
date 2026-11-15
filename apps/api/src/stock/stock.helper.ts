/**
 * Ядро event-sourced склада (Промт 11, ADR 0012).
 *
 * Функции (не сервисы): вызываются внутри транзакций сервисов с их
 * tx-клиентом — как notify.helper. Единая точка пересчёта баланса:
 * движение пишется в журнал, StockBalance обновляется по типу.
 *
 * Семантика StockMovementType (пересчёт баланса):
 *   INITIAL/RECEIPT/RETURN_IN/TRANSFER_IN — physical += q;
 *   WRITE_OFF/TRANSFER_OUT — physical -= q (требуют available >= q);
 *   RESERVED — reserved += q (требует available >= q);
 *   UNRESERVED — reserved -= q (снятие резерва);
 *   SALE_OUT — physical -= q (резерв снимается парным UNRESERVED
 *     движением при подтверждении заказа: в сумме physical −q и
 *     reserved −q, доступность не меняется);
 *   ADJUSTMENT — physical += delta (может увести в минус —
 *     инвентаризация честно фиксирует недостачу).
 *
 * Блокировка: SELECT ... FOR UPDATE на строку баланса сериализует
 * конкурентные движения одного (offer, location) (спека Промта 11).
 */
import { Prisma } from '@prisma/client';
import type { StockBalance, StockMovementType } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

/** Ввод одного движения (q > 0; delta — со знаком для ADJUSTMENT). */
export interface MovementInput {
  offerId: string;
  locationId: string;
  type: StockMovementType;
  quantity: number;
  reason: string;
  actorId?: string | null;
  refType?: string | null;
  refId?: string | null;
}

/** Клиент БД: корневой или транзакционный. */
type Db = Prisma.TransactionClient;

/** Типы списаний, требующие доступного остатка. */
const NEEDS_AVAILABLE: readonly StockMovementType[] = [
  'RESERVED',
  'WRITE_OFF',
  'TRANSFER_OUT',
];

/** delta движения по типу (q — абсолютное значение). */
export function movementDelta(type: StockMovementType, q: number): number {
  switch (type) {
    case 'RESERVED':
    case 'WRITE_OFF':
    case 'TRANSFER_OUT':
    case 'SALE_OUT':
      return -q;
    default:
      return q;
  }
}

/** Заблокировать строку баланса (SELECT ... FOR UPDATE). */
async function lockBalance(
  tx: Db,
  offerId: string,
  locationId: string,
): Promise<boolean> {
  const rows: { id: string }[] = await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM "StockBalance"
      WHERE "offerId" = ${offerId} AND "locationId" = ${locationId}
      FOR UPDATE`,
  );
  return rows.length > 0;
}

/** Доступный остаток оффера по всем складам. */
export async function availableOf(db: Db, offerId: string): Promise<number> {
  const agg = await db.stockBalance.aggregate({
    where: { offerId },
    _sum: { availableQty: true },
  });
  return agg._sum.availableQty ?? 0;
}

/** Суммарный остаток оффера по всем складам (physical/reserved/available). */
export async function totalsOf(
  db: Db,
  offerId: string,
): Promise<{ physicalQty: number; reservedQty: number; availableQty: number }> {
  const agg = await db.stockBalance.aggregate({
    where: { offerId },
    _sum: {
      physicalQty: true,
      reservedQty: true,
      availableQty: true,
    },
  });
  return {
    physicalQty: agg._sum.physicalQty ?? 0,
    reservedQty: agg._sum.reservedQty ?? 0,
    availableQty: agg._sum.availableQty ?? 0,
  };
}

/**
 * Применить движение: журнал + пересчёт баланса, атомарно.
 *
 * Блокирует строку баланса FOR UPDATE; новой строки у списаний быть
 * не может (нечего списывать), у приходов — upsert.
 */
export async function applyMovement(
  tx: Db,
  input: MovementInput,
): Promise<StockBalance> {
  const { offerId, locationId, type, reason } = input;
  const quantity = input.quantity;
  if (!reason || reason.trim().length < 3) {
    throw new BadRequestException({
      code: 'STOCK_REASON_REQUIRED',
      message: 'Укажите причину движения (минимум 3 символа)',
    });
  }

  const locked = await lockBalance(tx, offerId, locationId);

  if (!locked) {
    const adds: readonly StockMovementType[] = [
      'INITIAL',
      'RECEIPT',
      'RETURN_IN',
      'TRANSFER_IN',
      'ADJUSTMENT',
    ];
    if (!adds.includes(type)) {
      throw new BadRequestException({
        code: 'OUT_OF_STOCK',
        message: 'На складе нет остатка по этому предложению',
      });
    }
    const delta = movementDelta(type, quantity);
    const balance = await tx.stockBalance.upsert({
      where: { offerId_locationId: { offerId, locationId } },
      create: {
        offerId,
        locationId,
        physicalQty: Math.max(0, delta),
        reservedQty: 0,
        availableQty: Math.max(0, delta),
      },
      update: {},
    });
    await writeMovement(tx, input, delta);
    return balance;
  }

  const balance = await tx.stockBalance.findUnique({
    where: { offerId_locationId: { offerId, locationId } },
  });
  if (!balance) {
    throw new BadRequestException({
      code: 'STOCK_BALANCE_NOT_FOUND',
      message: 'Остаток не найден',
    });
  }

  // Списания требуют доступный остаток (ADJUSTMENT — исключение:
  // инвентаризация может показать недостачу и увести в минус).
  if (NEEDS_AVAILABLE.includes(type)) {
    if (balance.availableQty < quantity) {
      throw new BadRequestException({
        code: 'OUT_OF_STOCK',
        message: `Недостаточно на складе (${balance.availableQty} в наличии)`,
      });
    }
  }

  let physical = balance.physicalQty;
  let reserved = balance.reservedQty;
  switch (type) {
    case 'INITIAL':
    case 'RECEIPT':
    case 'RETURN_IN':
    case 'TRANSFER_IN':
      physical += quantity;
      break;
    case 'WRITE_OFF':
    case 'TRANSFER_OUT':
      physical -= quantity;
      break;
    case 'RESERVED':
      reserved += quantity;
      break;
    case 'UNRESERVED':
      reserved -= quantity;
      break;
    case 'SALE_OUT':
      physical -= quantity;
      break;
    case 'ADJUSTMENT':
      physical += quantity;
      break;
  }

  const updated = await tx.stockBalance.update({
    where: { offerId_locationId: { offerId, locationId } },
    data: {
      physicalQty: physical,
      reservedQty: reserved,
      availableQty: physical - reserved,
    },
  });
  await writeMovement(tx, input, movementDelta(type, quantity));
  return updated;
}

/** Запись в журнал движений (append-only). */
async function writeMovement(
  tx: Db,
  input: MovementInput,
  quantityDelta: number,
): Promise<void> {
  await tx.stockMovement.create({
    data: {
      offerId: input.offerId,
      locationId: input.locationId,
      type: input.type,
      quantityDelta,
      reason: input.reason.trim(),
      actorId: input.actorId ?? null,
      refType: input.refType ?? null,
      refId: input.refId ?? null,
    },
  });
}

/**
 * Default-склад организации: находит isDefault (или первый по
 * createdAt), при отсутствии создаёт «Основной склад» (WAREHOUSE).
 * Вызывается при onboarding, создании оффера и заказах без явного
 * склада. Идемпотентен.
 */
export async function ensureDefaultLocation(
  tx: Db,
  organizationId: string,
): Promise<string> {
  const existing = await tx.stockLocation.findFirst({
    where: { organizationId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    select: { id: true },
  });
  if (existing) {
    return existing.id;
  }
  const created = await tx.stockLocation.create({
    data: {
      organizationId,
      name: 'Основной склад',
      type: 'WAREHOUSE',
      isDefault: true,
    },
    select: { id: true },
  });
  return created.id;
}

/** Условие поиска движений заказа (refType='order'). */
function orderMovementsWhere(orderId: string, type: StockMovementType) {
  return { refType: 'order', refId: orderId, type };
}

/**
 * Зарезервировать количество под заказ: распределение по складам
 * FIFO (по времени создания склада). Каждый кусок — движение
 * RESERVED со ссылкой на заказ. Суммарно не хватает — OUT_OF_STOCK
 * (транзакция создания заказа откатывается целиком).
 */
export async function reserveForOrder(
  tx: Db,
  offerId: string,
  quantity: number,
  orderId: string,
  orderNumber: string,
  buyerId: string,
): Promise<void> {
  const balances = await tx.stockBalance.findMany({
    where: { offerId, availableQty: { gt: 0 } },
    orderBy: [{ location: { createdAt: 'asc' } }, { id: 'asc' }],
  });
  const total = balances.reduce((sum, b) => sum + b.availableQty, 0);
  if (total < quantity) {
    throw new BadRequestException({
      code: 'OUT_OF_STOCK',
      message: `Недостаточно на складе (в наличии ${total})`,
    });
  }
  let rest = quantity;
  for (const balance of balances) {
    if (rest <= 0) break;
    const chunk = Math.min(balance.availableQty, rest);
    await applyMovement(tx, {
      offerId,
      locationId: balance.locationId,
      type: 'RESERVED',
      quantity: chunk,
      reason: `Резерв заказа ${orderNumber}`,
      actorId: buyerId,
      refType: 'order',
      refId: orderId,
    });
    rest -= chunk;
  }
}

/**
 * Подтверждение заказа: резерв конвертируется в продажу. На каждый
 * RESERVED-кусок заказа — пара SALE_OUT (физический расход) +
 * UNRESERVED (снятие резерва). Доступность не меняется: она упала
 * при создании (резерв), физика списывается сейчас.
 */
export async function saleOutForOrder(
  tx: Db,
  orderId: string,
  orderNumber: string,
  actorId: string | null,
): Promise<void> {
  const reserved = await tx.stockMovement.findMany({
    where: orderMovementsWhere(orderId, 'RESERVED'),
    orderBy: { createdAt: 'asc' },
  });
  for (const move of reserved) {
    const q = Math.abs(move.quantityDelta);
    await applyMovement(tx, {
      offerId: move.offerId,
      locationId: move.locationId,
      type: 'SALE_OUT',
      quantity: q,
      reason: `Продажа по заказу ${orderNumber}`,
      actorId,
      refType: 'order',
      refId: orderId,
    });
    await applyMovement(tx, {
      offerId: move.offerId,
      locationId: move.locationId,
      type: 'UNRESERVED',
      quantity: q,
      reason: `Резерв заказа ${orderNumber} снят (продан)`,
      actorId,
      refType: 'order',
      refId: orderId,
    });
  }
}

/** Отмена PENDING-заказа: снять резервы (UNRESERVED по каждому куску). */
export async function unreserveForOrder(
  tx: Db,
  orderId: string,
  orderNumber: string,
  actorId: string | null,
): Promise<void> {
  const reserved = await tx.stockMovement.findMany({
    where: orderMovementsWhere(orderId, 'RESERVED'),
    orderBy: { createdAt: 'asc' },
  });
  for (const move of reserved) {
    await applyMovement(tx, {
      offerId: move.offerId,
      locationId: move.locationId,
      type: 'UNRESERVED',
      quantity: Math.abs(move.quantityDelta),
      reason: `Отмена заказа ${orderNumber} — возврат резерва`,
      actorId,
      refType: 'order',
      refId: orderId,
    });
  }
}

/**
 * Отмена CONFIRMED-заказа: товар уже продан (SALE_OUT) — возврат
 * на склад движением RETURN_IN по каждому списанному куску.
 */
export async function returnForOrder(
  tx: Db,
  orderId: string,
  orderNumber: string,
  actorId: string | null,
): Promise<void> {
  const sold = await tx.stockMovement.findMany({
    where: orderMovementsWhere(orderId, 'SALE_OUT'),
    orderBy: { createdAt: 'asc' },
  });
  for (const move of sold) {
    await applyMovement(tx, {
      offerId: move.offerId,
      locationId: move.locationId,
      type: 'RETURN_IN',
      quantity: Math.abs(move.quantityDelta),
      reason: `Отмена заказа ${orderNumber} — возврат товара`,
      actorId,
      refType: 'order',
      refId: orderId,
    });
  }
}

/** Проверка существования оффера (для ручных движений). */
export async function requireOffer(
  tx: Db,
  offerId: string,
): Promise<{ id: string; organizationId: string; product: { name: string } }> {
  const offer = await tx.productOffer.findUnique({
    where: { id: offerId },
    select: {
      id: true,
      organizationId: true,
      product: { select: { name: true } },
    },
  });
  if (!offer) {
    throw new NotFoundException({
      code: 'OFFER_NOT_FOUND',
      message: 'Предложение не найдено',
    });
  }
  return offer;
}
