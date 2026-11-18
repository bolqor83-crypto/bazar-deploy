/**
 * IconSeller — роль «Оптовик» (Промт 15, Часть A).
 *
 * Штабель из двух ящиков: передний светлее (золото), задний
 * темнее — ассоциация с оптовой партией товара.
 */
import { Svg, Rect } from 'react-native-svg';
import { iconPalette } from '../palette';

export interface IconSellerProps {
  size?: number;
}

export function IconSeller({ size = 24 }: IconSellerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Задний ящик */}
      <Rect
        x={7}
        y={4.5}
        width={12}
        height={7}
        rx={1}
        fill={iconPalette.wheatGoldDark}
      />
      {/* Передний ящик */}
      <Rect
        x={4}
        y={11}
        width={16}
        height={8.5}
        rx={1}
        fill={iconPalette.sellerGold}
      />
      {/* Прорези переднего ящика */}
      <Rect
        x={8}
        y={13.2}
        width={2}
        height={4.2}
        rx={1}
        fill={iconPalette.wheatGoldDark}
      />
      <Rect
        x={14}
        y={13.2}
        width={2}
        height={4.2}
        rx={1}
        fill={iconPalette.wheatGoldDark}
      />
    </Svg>
  );
}
