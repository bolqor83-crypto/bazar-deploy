/**
 * IconProducts — инструмент «Товары» (Промт 15, Часть A).
 *
 * Пакет с товаром: зелёный пакет, светлые ручки, сверху из
 * пакета выглядывает яблоко.
 */
import { Svg, Path, Rect } from 'react-native-svg';
import { iconPalette } from '../palette';

export interface IconProductsProps {
  size?: number;
}

export function IconProducts({ size = 24 }: IconProductsProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Ручки пакета (за яблоком) */}
      <Path
        fill="none"
        d="M9 13.6V11.5C9 9.6 10.3 8 12 8C13.7 8 15 9.6 15 11.5V13.6"
        stroke={iconPalette.leafGreenLight}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      {/* Яблоко выглядывает из пакета */}
      <Path
        d="M12 8.8C13.6 7.4 16.4 8.4 16.4 10.8C16.4 12 15.7 13 15 13.6H9C8.3 13 7.6 12 7.6 10.8C7.6 8.4 10.4 7.4 12 8.8Z"
        fill={iconPalette.tomatoBody}
      />
      {/* Тело пакета */}
      <Rect
        x={5.5}
        y={13.6}
        width={13}
        height={6.9}
        rx={1}
        fill={iconPalette.leafGreen}
      />
    </Svg>
  );
}
