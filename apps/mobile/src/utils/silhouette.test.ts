/**
 * Тесты resolveSilhouette (Промт 16, Часть A).
 *
 * Ключевые слова всех категорий, регистр, ё/е, составные
 * названия («Помидоры бакинские» → tomato), fallback crate.
 * Все 30 seed-товаров покрыты (изюм → crate — осознанно).
 */
import { resolveSilhouette } from './silhouette';

describe('resolveSilhouette (Промт 16, A)', () => {
  it.each([
    ['Картофель мытый', 'potato'],
    ['Картофель продовольственный', 'potato'],
    ['Помидоры розовые', 'tomato'],
    ['Томаты черри на ветке', 'tomato'],
    ['ПОМИДОРЫ БАКИНСКИЕ', 'tomato'],
    ['Огурцы гладкие', 'cucumber'],
    ['Перец болгарский красный', 'pepper'],
    ['Баклажаны', 'eggplant'],
    ['Кабачки молодые', 'zucchini'],
    ['Морковь мытая', 'carrot'],
    ['Свёкла столовая', 'beet'],
    ['Свекла столовая (без ё)', 'beet'],
    ['Лук репчатый золотистый', 'onion'],
    ['Капуста белокочанная', 'cabbage'],
    ['Яблоки Гала', 'apple'],
    ['Яблоки Гренни Смит', 'apple'],
    ['Груши Конференц', 'pear'],
    ['Апельсины столовые', 'citrus'],
    ['Мандарины без косточек', 'citrus'],
    ['Лимоны', 'citrus'],
    ['Виноград кишмиш белый', 'grapes'],
    ['Бананы', 'banana'],
    ['Укроп', 'greensBunch'],
    ['Петрушка', 'greensBunch'],
    ['Кинза', 'greensBunch'],
    ['Руккола', 'greensBunch'],
    ['Базилик свежий', 'greensBunch'],
    ['Салат листовой микс', 'lettuceHead'],
    ['Салат айсберг', 'lettuceHead'],
    ['Рис круглозёрный', 'grainSack'],
    ['Гречка ядрица', 'grainSack'],
    ['Пшено', 'grainSack'],
    ['Хлопья овсяные', 'grainSack'],
    ['Крупа перловая', 'grainSack'],
    ['Молоко 3,2%', 'milkBottle'],
    ['Кефир 1%', 'milkBottle'],
    ['Творог 9%', 'curdTub'],
    ['Сыр «Гауда»', 'cheeseWedge'],
    ['Мёд разнотравье', 'honeyJar'],
    ['Мед цветочный (без ё)', 'honeyJar'],
    ['Грецкий орех', 'nuts'],
  ])('%s → %s', (title, key) => {
    expect(resolveSilhouette(title)).toBe(key);
  });

  it('неизвестное название — универсальный ящик crate', () => {
    expect(resolveSilhouette('Изюм тёмный')).toBe('crate');
    // «Кофе в зёрнах» содержит корень «зерн» → grainSack по
    // таблице ключевых слов — это не fallback, а совпадение.
    expect(resolveSilhouette('Кофе арабика')).toBe('crate');
    expect(resolveSilhouette('Чай чёрный листовой')).toBe('crate');
    expect(resolveSilhouette('Специи ассорти')).toBe('crate');
    expect(resolveSilhouette('')).toBe('crate');
  });
});
