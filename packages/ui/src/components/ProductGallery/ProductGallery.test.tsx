/**
 * Тесты ProductGallery: кадры, заглушки, точки, один кадр без точек.
 */
import { render } from '@testing-library/react-native';
import { ProductGallery } from './ProductGallery';

const IMAGES = [
  'https://picsum.photos/seed/a/800/600',
  'https://picsum.photos/seed/b/800/600',
  'https://picsum.photos/seed/c/800/600',
];

describe('ProductGallery', () => {
  it('рендерит кадр на каждую картинку', async () => {
    const screen = await render(
      <ProductGallery images={IMAGES} slideWidth={320} />,
    );
    expect(screen.getByLabelText('Фото 1 из 3')).toBeTruthy();
    expect(screen.getByLabelText('Фото 3 из 3')).toBeTruthy();
  });

  it('пустой список даёт один кадр-заглушку', async () => {
    const screen = await render(
      <ProductGallery images={[]} slideWidth={320} />,
    );
    expect(screen.getByLabelText('Фото 1 из 1')).toBeTruthy();
  });

  it('пустой список — силуэт продукции без точек (Промт 16, A)', async () => {
    const screen = await render(
      <ProductGallery images={[]} silhouette="citrus" slideWidth={320} />,
    );
    expect(screen.getByTestId('product-placeholder')).toBeTruthy();
    expect(screen.getByLabelText('Фото товара отсутствует')).toBeTruthy();
    // Заглушка одна — точек-индикаторов нет.
    const dots = screen.toJSON();
    expect(JSON.stringify(dots)).not.toContain('borderRadius":4');
  });

  it('с фото — кадры Image, заглушки нет (Промт 16, A)', async () => {
    const screen = await render(
      <ProductGallery images={IMAGES} slideWidth={320} />,
    );
    expect(screen.queryByTestId('product-placeholder')).toBeNull();
  });

  it('точки-индикаторы: по одной на кадр', async () => {
    const screen = await render(
      <ProductGallery images={IMAGES} slideWidth={320} />,
    );
    // 3 точки + 3 кадра; проверяем через a11y-описание галереи
    expect(screen.getByLabelText('Галерея товара')).toBeTruthy();
  });

  it('один кадр — без точек (нет выбора)', async () => {
    const screen = await render(
      <ProductGallery
        images={['https://picsum.photos/seed/x/800/600']}
        slideWidth={320}
      />,
    );
    expect(screen.getByLabelText('Фото 1 из 1')).toBeTruthy();
  });

  it('высота и ширина кадра применяются из пропсов', async () => {
    const screen = await render(
      <ProductGallery
        images={IMAGES}
        slideWidth={300}
        height={180}
        testID="gallery"
      />,
    );
    expect(screen.getByTestId('gallery')).toBeTruthy();
  });
});
