/**
 * SilhouetteZucchini — силуэт: кабачок (Промт 16, Часть A).
 *
 * Одноцветный filled-SVG (viewBox 0 0 24 24), не более двух
 * Path, без stroke-деталей: лаконичная геометрия вместо
 * детализации (правило Промта 15). Цвет заливки передаётся
 * снаружи — компонент не знает о теме.
 */
import { Svg, Path } from 'react-native-svg';
import { placeholderPalette } from './palette';
import type { SilhouetteProps } from './props';

export function SilhouetteZucchini({
  size = 24,
  color = placeholderPalette.shapeLight,
}: SilhouetteProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8.2 11.6C8.2 7.6 9.8 4.9 12 4.9s3.8 2.7 3.8 6.7v4.2c0 4-1.6 6.7-3.8 6.7s-3.8-2.7-3.8-6.7v-4.2Z"
        fill={color}
      />
      <Path
        d="M10.2 5.2c-.4-1.4 0-2.6 1.2-3.5 1.1.9 1.6 2.1 1.2 3.5-.8.4-1.6.4-2.4 0Z"
        fill={color}
      />
    </Svg>
  );
}
