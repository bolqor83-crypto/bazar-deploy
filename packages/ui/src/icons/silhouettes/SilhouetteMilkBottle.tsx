/**
 * SilhouetteMilkBottle — силуэт: бутылка молока (Промт 16, Часть A).
 *
 * Одноцветный filled-SVG (viewBox 0 0 24 24), не более двух
 * Path, без stroke-деталей: лаконичная геометрия вместо
 * детализации (правило Промта 15). Цвет заливки передаётся
 * снаружи — компонент не знает о теме.
 */
import { Svg, Path } from 'react-native-svg';
import { placeholderPalette } from './palette';
import type { SilhouetteProps } from './props';

export function SilhouetteMilkBottle({
  size = 24,
  color = placeholderPalette.shapeLight,
}: SilhouetteProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.2 2.3h3.6c.4 0 .7.3.7.8v2.5c0 .8.3 1.2.9 1.9.9 1 1.4 2.2 1.4 3.6v7.9c0 1.4-1.1 2.5-2.4 2.5H9.6c-1.4 0-2.4-1.1-2.4-2.5v-7.9c0-1.4.5-2.6 1.4-3.6.6-.7.9-1.1.9-1.9V3.1c0-.5.3-.8.7-.8Z"
        fill={color}
      />
    </Svg>
  );
}
