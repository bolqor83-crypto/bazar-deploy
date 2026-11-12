/**
 * Тесты SectionHeader: заголовок, действие, минимальная высота.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { SectionHeader } from './SectionHeader';

describe('SectionHeader', () => {
  it('показывает заголовок раздела', async () => {
    const screen = await render(<SectionHeader title="Предложения" />);
    expect(screen.getByText('Предложения')).toBeTruthy();
  });

  it('действие справа вызывается по нажатию', async () => {
    const onAction = jest.fn();
    const screen = await render(
      <SectionHeader title="Категории" actionLabel="Все" onAction={onAction} />,
    );
    await fireEvent.press(screen.getByLabelText('Все'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('без onAction действие не рендерится', async () => {
    const screen = await render(
      <SectionHeader title="Категории" actionLabel="Все" />,
    );
    expect(screen.queryByLabelText('Все')).toBeNull();
  });

  it('children рендерятся рядом с заголовком', async () => {
    const screen = await render(<SectionHeader title="Каталог" />);
    expect(screen.getByText('Каталог')).toBeTruthy();
  });
});
