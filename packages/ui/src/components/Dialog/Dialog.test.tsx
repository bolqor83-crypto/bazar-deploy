/**
 * Тесты компонента Dialog (нижний шит).
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useState, type ComponentProps } from 'react';
import { Text } from '../Text';
import { Dialog } from './Dialog';

function Harness(props: Partial<ComponentProps<typeof Dialog>> = {}) {
  const [visible, setVisible] = useState(true);
  return (
    <Dialog visible={visible} onClose={() => setVisible(false)} title="Выбор точки" {...props}>
      <Text>Содержимое шита</Text>
    </Dialog>
  );
}

describe('Dialog', () => {
  it('показывается при visible и скрывает контент при закрытии', async () => {
    const screen = await render(<Harness />);
    expect(screen.getByText('Содержимое шита')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Закрыть'));
    // Анимация закрытия 220 мс — ждём размонтирования
    await waitFor(
      () => {
        expect(screen.queryByText('Содержимое шита')).toBeNull();
      },
      { timeout: 2000 }
    );
  });

  it('тап по подложке закрывает шит', async () => {
    const onClose = jest.fn();
    const screen = await render(
      <Dialog visible onClose={onClose} title="Шит">
        <Text>Контент</Text>
      </Dialog>
    );
    await fireEvent.press(screen.getByLabelText('Закрыть'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('dismissable=false блокирует закрытие по подложке', async () => {
    const onClose = jest.fn();
    const screen = await render(
      <Dialog visible onClose={onClose} dismissable={false} title="Шит">
        <Text>Контент</Text>
      </Dialog>
    );
    await fireEvent.press(screen.getByLabelText('Закрыть'));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Контент')).toBeTruthy();
  });

  it('заголовок рендерится', async () => {
    const screen = await render(
      <Dialog visible onClose={() => {}} title="Переключить контекст">
        <Text>Контент</Text>
      </Dialog>
    );
    expect(screen.getByText('Переключить контекст')).toBeTruthy();
  });

  it('без заголовка не падает', async () => {
    const screen = await render(
      <Dialog visible onClose={() => {}}>
        <Text>Только контент</Text>
      </Dialog>
    );
    expect(screen.getByText('Только контент')).toBeTruthy();
  });
});
