/**
 * OrderStatus — статус заказа.
 *
 * 11 состояний жизненного цикла (опт и розница). Русские подписи и
 * соответствия вариантам Badge собраны в константах — экраны
 * работают только со статусом, текст не дублируют.
 */
import { Badge, type BadgeVariant } from '../Badge';

/** Все статусы заказа Bazar. */
export const ORDER_STATUSES = [
  'draft',
  'new',
  'confirmed',
  'assembling',
  'ready',
  'in_delivery',
  'delivered',
  'completed',
  'cancelled',
  'returned',
  'disputed',
] as const;

export type OrderStatusType = (typeof ORDER_STATUSES)[number];

/** Русские подписи статусов. */
export const ORDER_STATUS_LABELS: Record<OrderStatusType, string> = {
  draft: 'Черновик',
  new: 'Новый',
  confirmed: 'Подтверждён',
  assembling: 'Комплектуется',
  ready: 'Готов к выдаче',
  in_delivery: 'В доставке',
  delivered: 'Доставлен',
  completed: 'Завершён',
  cancelled: 'Отменён',
  returned: 'Возврат',
  disputed: 'Спор',
};

/** Статус → вариант Badge (янтарь и терракота, красного нет). */
const ORDER_STATUS_BADGE: Record<OrderStatusType, BadgeVariant> = {
  draft: 'neutral',
  new: 'info',
  confirmed: 'info',
  assembling: 'warning',
  ready: 'success',
  in_delivery: 'info',
  delivered: 'success',
  completed: 'success',
  cancelled: 'danger',
  returned: 'danger',
  disputed: 'warning',
};

export interface OrderStatusProps {
  status: OrderStatusType;
}

export function OrderStatus({ status }: OrderStatusProps) {
  return (
    <Badge variant={ORDER_STATUS_BADGE[status]}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
