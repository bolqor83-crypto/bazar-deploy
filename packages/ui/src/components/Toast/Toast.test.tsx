/**
 * Тесты Toast: провайдер, очередь, таймеры (fake timers).
 *
 * Fake timers включаем ПОСЛЕ render: планировщик React использует
 * setTimeout, и при заблаговременном включении дерево не флашится.
 */
import { act, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from '../Text';
import { ToastProvider } from './Toast';
import { useToast, useToastStore } from './toastStore';

function Harness() {
  const { show } = useToast();
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <Text>Экран приложения</Text>
        <Text
          onPress={() =>
            show({ variant: 'success', message: 'Заказ отправлен' })
          }
        >
          Показать тост
        </Text>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

/** Рендер с включением fake timers после появления дерева. */
async function renderHarness() {
  const screen = await render(<Harness />);
  jest.useFakeTimers();
  return screen;
}

describe('Toast', () => {
  beforeEach(() => {
    useToastStore.setState({ queue: [] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('не показывает ничего без уведомлений', async () => {
    const screen = await renderHarness();
    expect(screen.getByText('Экран приложения')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('показывает уведомление и скрывает по таймеру', async () => {
    const screen = await renderHarness();
    await fireEvent.press(screen.getByText('Показать тост'));
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Заказ отправлен')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(3100);
    });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('очередь: второе уведомление показывается после первого', async () => {
    const screen = await renderHarness();
    const { show } = useToastStore.getState();
    await act(async () => {
      show({ variant: 'info', message: 'Первое' });
      show({ variant: 'info', message: 'Второе' });
    });
    expect(screen.getByText('Первое')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(3100);
    });
    expect(screen.getByText('Второе')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(3100);
    });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('тап по карточке закрывает уведомление досрочно', async () => {
    const screen = await renderHarness();
    await fireEvent.press(screen.getByText('Показать тост'));
    await fireEvent.press(screen.getByRole('alert'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('кастомная длительность учитывается', async () => {
    const screen = await renderHarness();
    const { show } = useToastStore.getState();
    await act(async () => {
      show({ variant: 'error', message: 'Ошибка', duration: 5000 });
    });
    expect(screen.getByText('Ошибка')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(3100);
    });
    expect(screen.getByText('Ошибка')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('действие: кнопка выполняется и закрепляет уведомление', async () => {
    const run = jest.fn();
    const screen = await renderHarness();
    const { show } = useToastStore.getState();
    await act(async () => {
      show({
        variant: 'error',
        message: 'Ошибка',
        action: { label: 'Скопировать лог', run },
      });
    });
    // Кнопка действия доступна.
    const action = screen.getByRole('button', { name: 'Скопировать лог' });
    expect(action).toBeTruthy();

    await fireEvent.press(action);
    expect(run).toHaveBeenCalledTimes(1);

    // Закреплено: таймер 3 с больше не скрывает карточку.
    await act(async () => {
      jest.advanceTimersByTime(3100);
    });
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Ошибка')).toBeTruthy();

    // Тап по карточке закрывает вручную.
    await fireEvent.press(screen.getByRole('alert'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('действие: повторное нажатие не запускает таймер', async () => {
    const run = jest.fn();
    const screen = await renderHarness();
    const { show } = useToastStore.getState();
    await act(async () => {
      show({
        variant: 'error',
        message: 'Ошибка',
        action: { label: 'Скопировать лог', run },
      });
    });
    await fireEvent.press(
      screen.getByRole('button', { name: 'Скопировать лог' }),
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Скопировать лог' }),
    );
    expect(run).toHaveBeenCalledTimes(2);
    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
