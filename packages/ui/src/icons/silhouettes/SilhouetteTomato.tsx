/**
 * SilhouetteTomato — силуэт: помидор (Промт 16, Часть A).
 *
 * Одноцветный filled-SVG (viewBox 0 0 24 24), не более двух
 * Path, без stroke-деталей: лаконичная геометрия вместо
 * детализации (правило Промта 15). Цвет заливки передаётся
 * снаружи — компонент не знает о теме.
 */
import { Svg, Path } from 'react-native-svg';
import { placeholderPalette } from './palette';
import type { SilhouetteProps } from './props';

export function SilhouetteTomato({
  size = 24,
  color = placeholderPalette.shapeLight,
}: SilhouetteProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 6.7c4.6 0 7.9 2.9 7.9 6.7 0 4-3.5 6.6-7.9 6.6s-7.9-2.6-7.9-6.6c0-3.8 3.3-6.7 7.9-6.7Z"
        fill={color}
      />
      <Path
        d="M12 2.2l1.8 2.4 2.9-.9-1.5 2.7 1.6 1.8-4.8.6-4.8-.6 1.6-1.8-1.5-2.7 2.9.9L12 2.2Z"
        fill={color}
      />
    </Svg>
  );
}
