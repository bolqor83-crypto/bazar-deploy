/**
 * Библиотека силуэтов продукции (Промт 16, Часть A).
 *
 * 24 одноцветных filled-SVG-заглушки для товаров без фото:
 * узнаваемая форма на намеренно бледном фоне — «заглушка
 * должна хотеться заменить» (ADR 0016). Ключ силуэта решает
 * бизнес-слой (apps/mobile, resolveSilhouette) — UI-пакет
 * не мапит названия товаров на силуэты.
 *
 * Палитра (placeholderPalette) живёт отдельно от UI-токенов
 * и iconPalette: силуэт — декоративное изображение, контраст
 * ~1.5–2:1, WCAG 1.4.11 не применяется (см. silhouettes/palette.ts).
 */
import type { ComponentType } from 'react';

import { SilhouettePotato } from './SilhouettePotato';
import { SilhouetteTomato } from './SilhouetteTomato';
import { SilhouetteCucumber } from './SilhouetteCucumber';
import { SilhouettePepper } from './SilhouettePepper';
import { SilhouetteEggplant } from './SilhouetteEggplant';
import { SilhouetteZucchini } from './SilhouetteZucchini';
import { SilhouetteCarrot } from './SilhouetteCarrot';
import { SilhouetteBeet } from './SilhouetteBeet';
import { SilhouetteOnion } from './SilhouetteOnion';
import { SilhouetteCabbage } from './SilhouetteCabbage';
import { SilhouetteApple } from './SilhouetteApple';
import { SilhouettePear } from './SilhouettePear';
import { SilhouetteCitrus } from './SilhouetteCitrus';
import { SilhouetteGrapes } from './SilhouetteGrapes';
import { SilhouetteBanana } from './SilhouetteBanana';
import { SilhouetteGreensBunch } from './SilhouetteGreensBunch';
import { SilhouetteLettuceHead } from './SilhouetteLettuceHead';
import { SilhouetteGrainSack } from './SilhouetteGrainSack';
import { SilhouetteMilkBottle } from './SilhouetteMilkBottle';
import { SilhouetteCurdTub } from './SilhouetteCurdTub';
import { SilhouetteCheeseWedge } from './SilhouetteCheeseWedge';
import { SilhouetteHoneyJar } from './SilhouetteHoneyJar';
import { SilhouetteNuts } from './SilhouetteNuts';
import { SilhouetteCrate } from './SilhouetteCrate';
import type { SilhouetteProps } from './props';

export { placeholderPalette } from './palette';
export type { PlaceholderPaletteKey } from './palette';
export type { SilhouetteProps } from './props';

/** Ключ силуэта: приходит из бизнес-слоя, UI не мапит. */
export type SilhouetteKey =
  | 'potato'
  | 'tomato'
  | 'cucumber'
  | 'pepper'
  | 'eggplant'
  | 'zucchini'
  | 'carrot'
  | 'beet'
  | 'onion'
  | 'cabbage'
  | 'apple'
  | 'pear'
  | 'citrus'
  | 'grapes'
  | 'banana'
  | 'greensBunch'
  | 'lettuceHead'
  | 'grainSack'
  | 'milkBottle'
  | 'curdTub'
  | 'cheeseWedge'
  | 'honeyJar'
  | 'nuts'
  | 'crate';

/** Все силуэты по ключу (для шоукейса и тестов). */
export const SILHOUETTES: Record<
  SilhouetteKey,
  ComponentType<SilhouetteProps>
> = {
  potato: SilhouettePotato,
  tomato: SilhouetteTomato,
  cucumber: SilhouetteCucumber,
  pepper: SilhouettePepper,
  eggplant: SilhouetteEggplant,
  zucchini: SilhouetteZucchini,
  carrot: SilhouetteCarrot,
  beet: SilhouetteBeet,
  onion: SilhouetteOnion,
  cabbage: SilhouetteCabbage,
  apple: SilhouetteApple,
  pear: SilhouettePear,
  citrus: SilhouetteCitrus,
  grapes: SilhouetteGrapes,
  banana: SilhouetteBanana,
  greensBunch: SilhouetteGreensBunch,
  lettuceHead: SilhouetteLettuceHead,
  grainSack: SilhouetteGrainSack,
  milkBottle: SilhouetteMilkBottle,
  curdTub: SilhouetteCurdTub,
  cheeseWedge: SilhouetteCheeseWedge,
  honeyJar: SilhouetteHoneyJar,
  nuts: SilhouetteNuts,
  crate: SilhouetteCrate,
};

/** Пары «ключ — подпись» для шоукейса /dev/design и отчётов. */
export const SILHOUETTE_LABELS: readonly {
  key: SilhouetteKey;
  label: string;
}[] = [
  { key: 'potato', label: 'Картофель' },
  { key: 'tomato', label: 'Помидор' },
  { key: 'cucumber', label: 'Огурец' },
  { key: 'pepper', label: 'Перец' },
  { key: 'eggplant', label: 'Баклажан' },
  { key: 'zucchini', label: 'Кабачок' },
  { key: 'carrot', label: 'Морковь' },
  { key: 'beet', label: 'Свёкла' },
  { key: 'onion', label: 'Лук' },
  { key: 'cabbage', label: 'Капуста' },
  { key: 'apple', label: 'Яблоко' },
  { key: 'pear', label: 'Груша' },
  { key: 'citrus', label: 'Цитрус' },
  { key: 'grapes', label: 'Виноград' },
  { key: 'banana', label: 'Банан' },
  { key: 'greensBunch', label: 'Зелень' },
  { key: 'lettuceHead', label: 'Салат' },
  { key: 'grainSack', label: 'Крупы' },
  { key: 'milkBottle', label: 'Молоко' },
  { key: 'curdTub', label: 'Творог' },
  { key: 'cheeseWedge', label: 'Сыр' },
  { key: 'honeyJar', label: 'Мёд' },
  { key: 'nuts', label: 'Орехи' },
  { key: 'crate', label: 'Ящик' },
];
