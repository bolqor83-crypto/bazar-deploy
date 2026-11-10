/**
 * Тесты компонента EmptyState.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { PackageOpen } from 'lucide-react-native';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('рендерит заголовок и описание', async () => {
    const screen = await render(
      <EmptyState title="Закупок пока нет" description="Соберите список на завтра" />
    );
    expect(screen.getByText('Закупок пока нет')).toBeTruthy();
    expect(screen.getByText('Соберите список на завтра')).toBeTruthy();
  });

  it('иконка рендерится с размером 64', async () => {
    const screen = await render(<EmptyState icon={PackageOpen} title="Пусто" />);
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('"width":64');
    expect(json).toContain('"height":64');
  });

  it('action-кнопка нажимается', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <EmptyState title="Пусто" action={{ label: 'Создать закупку', onPress }} />
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Создать закупку' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('без action и иконки не падает', async () => {
    const screen = await render(<EmptyState title="Просто заголовок" />);
    expect(screen.getByText('Просто заголовок')).toBeTruthy();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('текст «Нет данных» не используется компонентом', async () => {
    const screen = await render(<EmptyState title="Осмысленный текст" />);
    expect(screen.queryByText('Нет данных')).toBeNull();
  });
});
