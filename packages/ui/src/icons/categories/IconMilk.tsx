/**
 * IconMilk — категория «Молочное» (Промт 15, Часть A).
 *
 * Пакет молока: светлое тело с синим контуром (иначе светлое
 * тело пропадает на белом фоне), двускатная крыша-сгиб
 * и синяя фирменная полоса.
 */
import { Svg, Path, Rect } from 'react-native-svg';
import { iconPalette } from '../palette';

export interface IconMilkProps {
  size?: number;
}

export function IconMilk({ size = 24 }: IconMilkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Крыша-сгиб пакета */}
      <Path
        fill="none"
        d="M8.5 9.5L10.2 5.5H13.8L15.5 9.5"
        stroke={iconPalette.milkBlue}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* Тело пакета */}
      <Path
        d="M8.5 9.5H15.5V19.5C15.5 20.05 15.05 20.5 14.5 20.5H9.5C8.95 20.5 8.5 20.05 8.5 19.5V9.5Z"
        fill={iconPalette.milkWhite}
        stroke={iconPalette.milkBlue}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* Синяя полоса */}
      <Rect
        x={8.5}
        y={13.5}
        width={7}
        height={3.2}
        fill={iconPalette.milkBlue}
      />
    </Svg>
  );
}
