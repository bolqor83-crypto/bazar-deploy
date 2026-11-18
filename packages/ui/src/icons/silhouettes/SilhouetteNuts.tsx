/**
 * SilhouetteNuts — силуэт: орехи (Промт 16, Часть A).
 *
 * Одноцветный filled-SVG (viewBox 0 0 24 24), не более двух
 * Path, без stroke-деталей: лаконичная геометрия вместо
 * детализации (правило Промта 15). Цвет заливки передаётся
 * снаружи — компонент не знает о теме.
 */
import { Svg, Path } from 'react-native-svg';
import { placeholderPalette } from './palette';
import type { SilhouetteProps } from './props';

export function SilhouetteNuts({
  size = 24,
  color = placeholderPalette.shapeLight,
}: SilhouetteProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8.4 3.9c2.3.7 3.8 2.9 3.6 5.6-.1 2-1.5 3.7-3.4 4-2.7.4-5.2-1.6-5.2-4.5 0-2.8 2.7-5.8 5-5.1ZM15.5 10.1c2.3.7 3.8 2.9 3.6 5.6-.1 2-1.5 3.7-3.4 4-2.7.4-5.2-1.6-5.2-4.5 0-2.8 2.7-5.8 5-5.1Z"
        fill={color}
      />
    </Svg>
  );
}
