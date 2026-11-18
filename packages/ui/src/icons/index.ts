/**
 * Цветные SVG-иконки Bazar (Промт 15, Часть A).
 *
 * Правило «свежесть через цвет, а не через радугу»: цветом
 * выделяются только продукт и роль (категории каталога, роли
 * онбординга, инструменты «Все инструменты»). Функциональные
 * иконки (таб-бар, кнопки действий, формы) остаются монохромными
 * Lucide. Цвета — из iconPalette, НЕ из UI-токенов; в dark-теме
 * иконки не меняются (см. ADR 0015).
 */
import type { ComponentType } from 'react';
import type React from 'react';

import { IconCarrot } from './categories/IconCarrot';
import { IconApple } from './categories/IconApple';
import { IconGreens } from './categories/IconGreens';
import { IconGrain } from './categories/IconGrain';
import { IconMilk } from './categories/IconMilk';
import { IconBox } from './categories/IconBox';

import { IconBuyer } from './roles/IconBuyer';
import { IconSeller } from './roles/IconSeller';
import { IconCarrier } from './roles/IconCarrier';
import { IconStoreOwner } from './roles/IconStoreOwner';

import { IconProducts } from './tools/IconProducts';
import { IconOrders } from './tools/IconOrders';
import { IconStock } from './tools/IconStock';
import { IconDelivery } from './tools/IconDelivery';
import { IconFinance } from './tools/IconFinance';
import { IconAnalytics } from './tools/IconAnalytics';

export { iconPalette } from './palette';
export type { IconPaletteKey } from './palette';
export { IconCarrot, IconApple, IconGreens, IconGrain, IconMilk, IconBox };
export { IconBuyer, IconSeller, IconCarrier, IconStoreOwner };
export {
  IconProducts,
  IconOrders,
  IconStock,
  IconDelivery,
  IconFinance,
  IconAnalytics,
};

/** Пропсы цветной иконки: размер стороны квадрата. */
export interface ColoredIconProps {
  size?: number;
}

/** Компонент цветной иконки с маркером bazarColored. */
export type ColoredIcon = ComponentType<ColoredIconProps> & {
  readonly bazarColored?: true;
};

/** Маркировка: чипы и строки инструментов различают цветные
 *  иконки (без пропа color) и монохромные Lucide. */
function markColored(icon: ComponentType<ColoredIconProps>): ColoredIcon {
  const marked = icon as unknown as {
    (props: ColoredIconProps): React.ReactElement;
    bazarColored?: true;
  };
  marked.bazarColored = true;
  return marked as ColoredIcon;
}

markColored(IconCarrot);
markColored(IconApple);
markColored(IconGreens);
markColored(IconGrain);
markColored(IconMilk);
markColored(IconBox);
markColored(IconBuyer);
markColored(IconSeller);
markColored(IconCarrier);
markColored(IconStoreOwner);
markColored(IconProducts);
markColored(IconOrders);
markColored(IconStock);
markColored(IconDelivery);
markColored(IconFinance);
markColored(IconAnalytics);

/** Все 16 цветных иконок (для шоукейса /dev/design). */
export const ALL_COLORED_ICONS: readonly {
  icon: ColoredIcon;
  label: string;
}[] = [
  { icon: IconCarrot, label: 'Овощи' },
  { icon: IconApple, label: 'Фрукты' },
  { icon: IconGreens, label: 'Зелень' },
  { icon: IconGrain, label: 'Крупы' },
  { icon: IconMilk, label: 'Молочное' },
  { icon: IconBox, label: 'Прочее' },
  { icon: IconBuyer, label: 'Покупатель' },
  { icon: IconSeller, label: 'Оптовик' },
  { icon: IconCarrier, label: 'Перевозчик' },
  { icon: IconStoreOwner, label: 'Владелец точки' },
  { icon: IconProducts, label: 'Товары' },
  { icon: IconOrders, label: 'Заказы' },
  { icon: IconStock, label: 'Склад' },
  { icon: IconDelivery, label: 'Движения' },
  { icon: IconFinance, label: 'Финансы' },
  { icon: IconAnalytics, label: 'Аналитика' },
];

/** Проверка: компонент — цветная иконка Bazar. */
export function isColoredIcon(component: unknown): component is ColoredIcon {
  return (
    typeof component === 'function' &&
    (component as ColoredIcon).bazarColored === true
  );
}
