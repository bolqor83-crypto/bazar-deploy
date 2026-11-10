/**
 * Тесты компонента ErrorState.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('тексты по умолчанию', async () => {
    const screen = await render(<ErrorState />);
    expect(screen.getByText('Что-то пошло не так')).toBeTruthy();
    expect(screen.getByText('Проверьте соединение и попробуйте снова')).toBeTruthy();
  });

  it('onRetry: кнопка «Повторить» нажимается', async () => {
    const onRetry = jest.fn();
    const screen = await render(<ErrorState onRetry={onRetry} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Повторить' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('без onRetry кнопки нет', async () => {
    const screen = await render(<ErrorState />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('кастомные тексты подставляются', async () => {
    const screen = await render(
      <ErrorState title="Не загрузилось" description="Слабый сигнал" />
    );
    expect(screen.getByText('Не загрузилось')).toBeTruthy();
    expect(screen.getByText('Слабый сигнал')).toBeTruthy();
  });

  it('иконка ошибки в терракоте, не в красном', async () => {
    const screen = await render(<ErrorState />);
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('#9F4C3B');
    expect(json).not.toContain('#FF0000');
  });
});
