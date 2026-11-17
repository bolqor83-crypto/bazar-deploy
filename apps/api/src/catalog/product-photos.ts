/**
 * Стоковые фото каталога (Промт 12, итерация 3).
 *
 * VLM-аудит: витрина каталога со заглушками-корзинами во всех
 * карточках читалась как черновик, а не рабочий инструмент. Фото
 * лежат в apps/api/seed-media/products и раздаются через
 * GET /api/media/seed/products/<слаг>.png.
 *
 * Маппинг — по имени товара на уровне API: любая БД (прод, CI,
 * локальная) получает фото без миграций и обновлений данных.
 * Исторические picsum-URL из раннего сида отбрасываются: рандомные
 * пейзажи вместо товара хуже аккуратной заглушки.
 */

/** Имя товара из сида → ключ стокового фото. */
const STOCK_PHOTOS: Record<string, string> = {
  'Помидоры розовые': 'tomatoes',
  'Огурцы гладкие': 'cucumbers',
  'Картофель мытый': 'potatoes',
  'Лук репчатый золотистый': 'onions',
  'Морковь мытая': 'carrots',
  'Капуста белокочанная': 'cabbage',
  'Томаты черри на ветке': 'cherry',
  'Яблоки Гала': 'apples',
  'Яблоки Гренни Смит': 'apples',
  Бананы: 'bananas',
  Укроп: 'dill',
  Петрушка: 'parsley',
  'Рис круглозёрный': 'rice',
  'Молоко 3,2%': 'milk',
  'Мёд разнотравье': 'honey',
  'Груши Конференц': 'pears',
  'Кабачки молодые': 'zucchini',
  'Сыр «Гауда»': 'gouda',
  'Грецкий орех': 'walnuts',
};

/** Публичный путь стокового фото по ключу. */
export function stockPhotoUrl(slug: string): string {
  return `/api/media/seed/products/${slug}.png`;
}

/**
 * Итоговый список изображений товара: стоковое фото по имени, иначе
 * реальные URL (picsum-заглушки раннего сида отбрасываются).
 */
export function resolveProductImages(name: string, images: string[]): string[] {
  const slug = STOCK_PHOTOS[name];
  if (slug) {
    return [stockPhotoUrl(slug)];
  }
  return images.filter((url) => !url.includes('picsum.photos'));
}
