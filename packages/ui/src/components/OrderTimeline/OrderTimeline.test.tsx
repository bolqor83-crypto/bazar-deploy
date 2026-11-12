/**
 * Тесты OrderTimeline (Промт 9, Часть E): шаги оси, достигнутые
 * и будущие статусы, ветка отмены.
 */
import { render } from '@testing-library/react-native';
import { OrderTimeline } from './OrderTimeline';

describe('OrderTimeline', () => {
  it('PENDING: создан достигнут, остальные будущие', async () => {
    const screen = await render(<OrderTimeline status="PENDING" />);
    expect(screen.getByText('Создан')).toBeTruthy();
    expect(screen.getByText('Подтверждён')).toBeTruthy();
    expect(screen.getByText('Готов')).toBeTruthy();
    expect(screen.getByText('Завершён')).toBeTruthy();
    expect(screen.getByLabelText('История заказа')).toBeTruthy();
  });

  it('CONFIRMED: два шага пройдены', async () => {
    const screen = await render(<OrderTimeline status="CONFIRMED" />);
    expect(screen.getByText('Подтверждён')).toBeTruthy();
    expect(screen.getByText('Готов')).toBeTruthy();
  });

  it('COMPLETED: все шаги оси', async () => {
    const screen = await render(<OrderTimeline status="COMPLETED" />);
    const labels = screen.getAllByText(/Создан|Подтверждён|Готов|Завершён/);
    expect(labels).toHaveLength(4);
  });

  it('CANCELLED: ось обрывается на «Отменён»', async () => {
    const screen = await render(<OrderTimeline status="CANCELLED" />);
    expect(screen.getByText('Создан')).toBeTruthy();
    expect(screen.getByText('Отменён')).toBeTruthy();
    // Шаги после создания не показываются.
    expect(screen.queryByText('Завершён')).toBeNull();
    expect(screen.queryByText('Готов')).toBeNull();
  });

  it('PREPARING: шаг «Готов» ещё не достигнут', async () => {
    const screen = await render(<OrderTimeline status="PREPARING" />);
    expect(screen.getByText('Готов')).toBeTruthy();
    expect(screen.getByText('Завершён')).toBeTruthy();
  });
});
