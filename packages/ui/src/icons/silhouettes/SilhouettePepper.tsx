/**
 * SilhouettePepper — силуэт: болгарский перец (Промт 16, Часть A).
 *
 * Одноцветный filled-SVG (viewBox 0 0 24 24), не более двух
 * Path, без stroke-деталей: лаконичная геометрия вместо
 * детализации (правило Промта 15). Цвет заливки передаётся
 * снаружи — компонент не знает о теме.
 */
import { Svg, Path } from 'react-native-svg';
import { placeholderPalette } from './palette';
import type { SilhouetteProps } from './props';

export function SilhouettePepper({
  size = 24,
  color = placeholderPalette.shapeLight,
}: SilhouetteProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5.2c1.1 0 1.7.5 2.5.5 3.3 0 5.5 2.3 5.5 5.7 0 4.5-2.6 9.1-5.7 9.1-1 0-1.5-.5-2.3-.5s-1.3.5-2.3.5c-3.1 0-5.7-4.6-5.7-9.1 0-3.4 2.2-5.7 5.5-5.7.8 0 1.4-.5 2.5-.5Z"
        fill={color}
      />
      <Path
        d="M12 5.2c0-1.4.6-2.3 1.7-2.9.6.8.6 1.9.1 2.9-.6.3-1.2.3-1.8 0Z"
        fill={color}
      />
    </Svg>
  );
}
