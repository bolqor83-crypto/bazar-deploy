/**
 * Тесты MovementRow (Промт 11b): тип с подписью и иконкой, дельта
 * с цветом по знаку, причина и склад, ссылка на заказ.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { MovementRow } from './MovementRow';

const RECEIPT = {
  type: 'RECEIPT' as const,
  quantityDelta: 50,
  reason: 'Закупка у фермера',
  locationName: 'Основной склад',
  createdAt: '2026-11-15T08:30:00.000Z',
};

describe('MovementRow', () => {
  it('приход: подпись, причина, склад и положительная дельта', async () => {
    const screen = await render(<MovementRow {...RECEIPT} />);
    expect(screen.getByText('Приход')).toBeTruthy();
    expect(screen.getByText('Закупка у фермера')).toBeTruthy();
    expect(screen.getByText(/Основной склад/)).toBeTruthy();
    expect(screen.getByText('+50')).toBeTruthy();
  });

  it('списание: отрицательная дельта с типографским минусом', async () => {
    const screen = await render(
      <MovementRow
        {...RECEIPT}
        type="WRITE_OFF"
        quantityDelta={-10}
        reason="порча при перевозке"
      />,
    );
    expect(screen.getByText('Списание')).toBeTruthy();
    expect(screen.getByText('−10')).toBeTruthy();
  });

  it('резерв заказа отображается со своей подписью', async () => {
    const screen = await render(
      <MovementRow
        {...RECEIPT}
        type="RESERVED"
        quantityDelta={-20}
        reason="Резерв заказа BZ-2026-000006"
      />,
    );
    expect(screen.getByText('Резерв заказа')).toBeTruthy();
    expect(screen.getByText('−20')).toBeTruthy();
  });

  it('перемещения различаются подписями (со склада / на склад)', async () => {
    const screen = await render(
      <MovementRow
        {...RECEIPT}
        type="TRANSFER_OUT"
        quantityDelta={-30}
        reason="Развоз по точке"
      />,
    );
    expect(screen.getByText('Перемещение со склада')).toBeTruthy();
    const rerendered = await render(
      <MovementRow
        {...RECEIPT}
        type="TRANSFER_IN"
        quantityDelta={30}
        reason="Развоз по точке"
      />,
    );
    expect(rerendered.getByText('Перемещение на склад')).toBeTruthy();
    expect(screen.unmount).toBeTruthy();
  });

  it('ссылка на заказ делает строку кнопкой', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <MovementRow
        {...RECEIPT}
        type="SALE_OUT"
        quantityDelta={-20}
        reason="Продажа по заказу BZ-2026-000006"
        linkLabel="BZ-2026-000006"
        onPress={onPress}
        testID="movement-row-1"
      />,
    );
    expect(screen.getByText('BZ-2026-000006')).toBeTruthy();
    fireEvent.press(
      screen.getByRole('button', {
        name: /Продажа, −20, Продажа по заказу/,
      }),
    );
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('без onPress строка не кнопка (журнал только для чтения)', async () => {
    const screen = await render(<MovementRow {...RECEIPT} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
