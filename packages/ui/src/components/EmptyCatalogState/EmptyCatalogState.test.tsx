/**
 * Тесты EmptyCatalogState: тексты, действие сброса.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { EmptyCatalogState } from './EmptyCatalogState';

describe('EmptyCatalogState', () => {
  it('показывает осмысленный заголовок и описание', async () => {
    const screen = await render(<EmptyCatalogState />);
    expect(screen.getByText('Ничего не нашлось')).toBeTruthy();
    expect(
      screen.getByText(/Попробуйте изменить запрос или сбросить фильтры/),
    ).toBeTruthy();
  });

  it('с фильтрами показывает кнопку сброса', async () => {
    const onReset = jest.fn();
    const screen = await render(
      <EmptyCatalogState hasFilters onReset={onReset} />,
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Сбросить фильтры' }),
    );
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('без фильтров кнопки сброса нет', async () => {
    const screen = await render(<EmptyCatalogState onReset={jest.fn()} />);
    expect(
      screen.queryByRole('button', { name: 'Сбросить фильтры' }),
    ).toBeNull();
  });

  it('testID пробрасывается в корень', async () => {
    const screen = await render(<EmptyCatalogState testID="empty-catalog" />);
    expect(screen.getByTestId('empty-catalog')).toBeTruthy();
  });
});
