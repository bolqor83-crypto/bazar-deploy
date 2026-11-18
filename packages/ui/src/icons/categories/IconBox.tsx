/**
 * IconBox — категория «Прочее» (Промт 15, Часть A).
 *
 * Картонная коробка: бежевое тело, коричневая крышка
 * и вертикальная лента скотча по центру.
 */
import { Svg, Rect } from 'react-native-svg';
import { iconPalette } from '../palette';

export interface IconBoxProps {
  size?: number;
}

export function IconBox({ size = 24 }: IconBoxProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Крышка */}
      <Rect
        x={4}
        y={5}
        width={16}
        height={3.5}
        rx={1}
        fill={iconPalette.boxBrown}
      />
      {/* Тело */}
      <Rect
        x={5.2}
        y={8.5}
        width={13.6}
        height={11}
        rx={1}
        fill={iconPalette.boxBeige}
      />
      {/* Лента */}
      <Rect
        x={10.75}
        y={8.5}
        width={2.5}
        height={11}
        fill={iconPalette.boxBrown}
      />
    </Svg>
  );
}
