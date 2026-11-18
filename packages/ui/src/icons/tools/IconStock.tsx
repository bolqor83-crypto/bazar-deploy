/**
 * IconStock — инструмент «Склад» (Промт 15, Часть A).
 *
 * Склад: тёмная двускатная крыша, бежевый корпус, коричневые
 * ворота — узнаваемый силуэт здания с товаром внутри.
 */
import { Svg, Path, Rect } from 'react-native-svg';
import { iconPalette } from '../palette';

export interface IconStockProps {
  size?: number;
}

export function IconStock({ size = 24 }: IconStockProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Корпус */}
      <Rect
        x={5}
        y={10.5}
        width={14}
        height={9.5}
        rx={1}
        fill={iconPalette.boxBeige}
      />
      {/* Крыша */}
      <Path d="M3.5 11L12 4.5L20.5 11H3.5Z" fill={iconPalette.wheatGoldDark} />
      {/* Ворота */}
      <Rect
        x={9.5}
        y={14}
        width={5}
        height={6}
        rx={0.6}
        fill={iconPalette.boxBrown}
      />
    </Svg>
  );
}
