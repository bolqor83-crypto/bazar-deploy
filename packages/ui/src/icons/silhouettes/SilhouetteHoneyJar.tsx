/**
 * SilhouetteHoneyJar — силуэт: банка мёда (Промт 16, Часть A).
 *
 * Одноцветный filled-SVG (viewBox 0 0 24 24), не более двух
 * Path, без stroke-деталей: лаконичная геометрия вместо
 * детализации (правило Промта 15). Цвет заливки передаётся
 * снаружи — компонент не знает о теме.
 */
import { Svg, Path } from 'react-native-svg';
import { placeholderPalette } from './palette';
import type { SilhouetteProps } from './props';

export function SilhouetteHoneyJar({
  size = 24,
  color = placeholderPalette.shapeLight,
}: SilhouetteProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7.9 3.9h8.2c.8 0 1.4.6 1.4 1.4v1c0 .8-.6 1.4-1.4 1.4H7.9c-.8 0-1.4-.6-1.4-1.4v-1c0-.8.6-1.4 1.4-1.4Z"
        fill={color}
      />
      <Path
        d="M8.4 8.2h7.2c.5 0 .9.4 1 .9l1.3 9.7c.2 1.5-.9 2.8-2.4 2.8H8.5c-1.5 0-2.6-1.3-2.4-2.8l1.3-9.7c.1-.5.5-.9 1-.9Z"
        fill={color}
      />
    </Svg>
  );
}
