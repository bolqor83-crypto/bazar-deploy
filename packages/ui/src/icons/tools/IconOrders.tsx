/**
 * IconOrders — инструмент «Заказы» (Промт 15, Часть A).
 *
 * Клипборд со строками: светлое полотно, синяя рамка и клипса,
 * три строки позиций.
 */
import { Svg, Path, Rect } from 'react-native-svg';
import { iconPalette } from '../palette';

export interface IconOrdersProps {
  size?: number;
}

export function IconOrders({ size = 24 }: IconOrdersProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Полотно */}
      <Rect
        x={5.5}
        y={4.5}
        width={13}
        height={16}
        rx={1.5}
        fill={iconPalette.milkWhite}
        stroke={iconPalette.carrierBlue}
        strokeWidth={1.5}
      />
      {/* Клипса */}
      <Rect
        x={9.5}
        y={3}
        width={5}
        height={3}
        rx={1}
        fill={iconPalette.carrierBlue}
      />
      {/* Строки заказа */}
      <Path
        fill="none"
        d="M8.5 10.5H15.5M8.5 13.5H15.5M8.5 16.5H12.5"
        stroke={iconPalette.carrierBlue}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}
