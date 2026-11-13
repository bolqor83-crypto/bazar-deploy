/**
 * Тесты DeliveryTimeline (Промт 10): шаги по статусам, отмена.
 */
import { render } from '@testing-library/react-native';
import { DeliveryTimeline } from './DeliveryTimeline';

describe('DeliveryTimeline', () => {
  it('PENDING: только первый шаг достигнут', async () => {
    const screen = await render(<DeliveryTimeline status="PENDING" />);
    expect(screen.getByText('Заявка создана')).toBeTruthy();
    expect(screen.getByText('Перевозчик принял')).toBeTruthy();
    expect(screen.getByText('В пути')).toBeTruthy();
  });

  it('IN_TRANSIT: четыре шага пройдено', async () => {
    const screen = await render(<DeliveryTimeline status="IN_TRANSIT" />);
    expect(screen.getByText('Забрал груз')).toBeTruthy();
    expect(screen.getByText('Доставил')).toBeTruthy();
    expect(screen.getByText('Завершена')).toBeTruthy();
  });

  it('CANCELLED: ось останавливается на отмене', async () => {
    const screen = await render(<DeliveryTimeline status="CANCELLED" />);
    expect(screen.getByText('Заявка создана')).toBeTruthy();
    expect(screen.getByText('Отменена')).toBeTruthy();
    expect(screen.queryByText('В пути')).toBeNull();
  });

  it('COMPLETED: все шаги достигнуты', async () => {
    const screen = await render(<DeliveryTimeline status="COMPLETED" />);
    expect(screen.getByText('Завершена')).toBeTruthy();
    expect(screen.queryByText('Отменена')).toBeNull();
  });
});
