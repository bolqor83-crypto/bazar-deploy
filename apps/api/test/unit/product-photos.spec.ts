/**
 * Тесты маппинга стоковых фото каталога (Промт 12, итерация 3).
 */
import {
  resolveProductImages,
  stockPhotoUrl,
} from '../../src/catalog/product-photos';

describe('resolveProductImages', () => {
  it('товар из сида получает стоковое фото по имени', () => {
    expect(resolveProductImages('Помидоры розовые', [])).toEqual([
      '/api/media/seed/products/tomatoes.png',
    ]);
    expect(
      resolveProductImages('Помидоры розовые', [
        'https://picsum.photos/seed/a/800/600',
      ]),
    ).toEqual(['/api/media/seed/products/tomatoes.png']);
  });

  it('picsum-заглушки раннего сида отбрасываются', () => {
    expect(
      resolveProductImages('Свёкла столовая', [
        'https://picsum.photos/seed/x/800/600',
      ]),
    ).toEqual([]);
  });

  it('настоящие URL сохраняются для товаров без стокового фото', () => {
    expect(
      resolveProductImages('Изюм тёмный', [
        'https://cdn.example.com/raisin.jpg',
      ]),
    ).toEqual(['https://cdn.example.com/raisin.jpg']);
  });

  it('товары итерации 3 получают свои стоковые фото', () => {
    expect(resolveProductImages('Грецкий орех', [])).toEqual([
      '/api/media/seed/products/walnuts.png',
    ]);
    expect(resolveProductImages('Груши Конференц', [])).toEqual([
      '/api/media/seed/products/pears.png',
    ]);
    expect(resolveProductImages('Кабачки молодые', [])).toEqual([
      '/api/media/seed/products/zucchini.png',
    ]);
    expect(resolveProductImages('Петрушка', [])).toEqual([
      '/api/media/seed/products/parsley.png',
    ]);
    expect(resolveProductImages('Сыр «Гауда»', [])).toEqual([
      '/api/media/seed/products/gouda.png',
    ]);
    expect(resolveProductImages('Томаты черри на ветке', [])).toEqual([
      '/api/media/seed/products/cherry.png',
    ]);
  });

  it('stockPhotoUrl собирает путь раздачи', () => {
    expect(stockPhotoUrl('bananas')).toBe(
      '/api/media/seed/products/bananas.png',
    );
  });
});
