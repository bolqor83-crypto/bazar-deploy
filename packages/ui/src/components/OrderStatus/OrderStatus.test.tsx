/**
 * Тесты OrderStatus: все 11 статусов имеют русские подписи,
 * каждый рендерится бейджем.
 */
import { render } from '@testing-library/react-native';
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  OrderStatus,
} from './OrderStatus';

describe('OrderStatus', () => {
  it('ровно 11 статусов в константе', () => {
    expect(ORDER_STATUSES).toHaveLength(11);
  });

  it('у каждого статуса есть русская подпись', () => {
    for (const status of ORDER_STATUSES) {
      const label = ORDER_STATUS_LABELS[status];
      expect(label).toBeTruthy();
      expect(label.length).toBeGreaterThan(2);
    }
  });

  it.each(ORDER_STATUSES)('статус %s рендерится бейджем', async (status) => {
    const screen = await render(<OrderStatus status={status} />);
    expect(screen.getByText(ORDER_STATUS_LABELS[status])).toBeTruthy();
  });

  it('новый заказ → «Новый»', async () => {
    const screen = await render(<OrderStatus status="new" />);
    expect(screen.getByText('Новый')).toBeTruthy();
  });

  it('отмена → «Отменён»', async () => {
    const screen = await render(<OrderStatus status="cancelled" />);
    expect(screen.getByText('Отменён')).toBeTruthy();
  });
});
