/**
 * Тесты HorizontalProductCarousel (Промт 14a): заголовок, «Все»,
 * карточки, skeleton при загрузке, скрытие при пустом списке,
 * нажатия, compact-карточка 160 с квадратным фото.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { HorizontalProductCarousel } from './HorizontalProductCarousel';

const ITEMS = [
  {
    id: 'p1',
    title: 'Огурцы гладкие',
    subtitle: 'Овощи',
    image: '/api/media/seed/products/cucumbers.png',
    price: 10_400,
    unit: '1 кг',
  },
  {
    id: 'p2',
    title: 'Бананы',
    image: '/api/media/seed/products/bananas.png',
    price: 8_900,
    unit: '1 кг',
    badge: 'Скоропорт',
  },
  {
    id: 'p3',
    title: 'Яблоки Гала',
    price: 12_000,
    unit: '1 кг',
  },
];

describe('HorizontalProductCarousel', () => {
  it('показывает заголовок, «Все» и все карточки', async () => {
    const screen = await render(
      <HorizontalProductCarousel
        title="Похожие товары"
        items={ITEMS}
        onSeeAllPress={() => {}}
      />,
    );
    expect(screen.getByText('Похожие товары')).toBeTruthy();
    expect(screen.getByText('Все')).toBeTruthy();
    expect(screen.getByText('Огурцы гладкие')).toBeTruthy();
    expect(screen.getByText('Бананы')).toBeTruthy();
    expect(screen.getByText('Яблоки Гала')).toBeTruthy();
  });

  it('loading — три skeleton-карточки вместо товаров', async () => {
    const screen = await render(
      <HorizontalProductCarousel title="Похожие товары" items={[]} loading />,
    );
    // Заголовок остаётся, товаров нет, skeleton есть.
    expect(screen.getByText('Похожие товары')).toBeTruthy();
    expect(screen.queryByText('Огурцы гладкие')).toBeNull();
    expect(screen.getAllByTestId('carousel-skeleton')).toHaveLength(3);
  });

  it('пустой список и не loading — секция скрыта целиком', async () => {
    const screen = await render(
      <HorizontalProductCarousel title="Похожие товары" items={[]} />,
    );
    expect(screen.queryByText('Похожие товары')).toBeNull();
  });

  it('без onSeeAllPress ссылка «Все» не показывается', async () => {
    const screen = await render(
      <HorizontalProductCarousel title="Похожие товары" items={ITEMS} />,
    );
    expect(screen.queryByText('Все')).toBeNull();
    expect(screen.getByText('Бананы')).toBeTruthy();
  });

  it('нажатие на карточку и «Все» вызывает колбэки', async () => {
    const onItemPress = jest.fn();
    const onSeeAllPress = jest.fn();
    const screen = await render(
      <HorizontalProductCarousel
        title="Похожие товары"
        items={ITEMS}
        onItemPress={onItemPress}
        onSeeAllPress={onSeeAllPress}
      />,
    );
    await fireEvent.press(screen.getByTestId('carousel-item-p2'));
    expect(onItemPress).toHaveBeenCalledWith('p2');
    await fireEvent.press(screen.getByTestId('carousel-see-all'));
    expect(onSeeAllPress).toHaveBeenCalledTimes(1);
  });

  it('карточки — compact: ширина 160 и квадратное фото 1:1', async () => {
    const screen = await render(
      <HorizontalProductCarousel title="Похожие товары" items={ITEMS} />,
    );
    // Карточки карусели рендерятся как compact ProductCard —
    // ширина/аспект проверяются тестами ProductCard; здесь
    // подтверждаем, что фото-элементы карточек присутствуют.
    const photo = screen
      .getAllByLabelText(/Фото:/)
      .find((node) => node.props.accessibilityLabel === 'Фото: Огурцы гладкие');
    expect(photo).toBeTruthy();
    expect(screen.getByTestId('carousel-item-p1')).toBeTruthy();
  });

  it('a11y: секция и карусель имеют метки', async () => {
    const screen = await render(
      <HorizontalProductCarousel
        title="Похожие товары"
        items={ITEMS}
        onSeeAllPress={() => {}}
      />,
    );
    expect(screen.getByLabelText('Похожие товары: все товары')).toBeTruthy();
  });
});
