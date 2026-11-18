/**
 * SilhouetteEggplant — силуэт: баклажан (Промт 16, Часть A).
 *
 * Одноцветный filled-SVG (viewBox 0 0 24 24), не более двух
 * Path, без stroke-деталей: лаконичная геометрия вместо
 * детализации (правило Промта 15). Цвет заливки передаётся
 * снаружи — компонент не знает о теме.
 */
import { Svg, Path } from 'react-native-svg';
import { placeholderPalette } from './palette';
import type { SilhouetteProps } from './props';

export function SilhouetteEggplant({
  size = 24,
  color = placeholderPalette.shapeLight,
}: SilhouetteProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4.3c2.9 0 4.1 2.6 4.6 5.1.5 2.4 2 3.7 2 6 0 3.6-2.9 6.4-6.6 6.4S5.4 19 5.4 15.4c0-2.3 1.5-3.6 2-6 .5-2.5 1.7-5.1 4.6-5.1Z"
        fill={color}
      />
      <Path
        d="M10.9 4.5c-.3-1.2.1-2.3 1.1-3.1 1 .8 1.4 1.9 1.1 3.1-.7.4-1.5.4-2.2 0Z"
        fill={color}
      />
    </Svg>
  );
}
