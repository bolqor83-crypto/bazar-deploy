/**
 * SilhouetteApple — силуэт: яблоко (Промт 16, Часть A).
 *
 * Одноцветный filled-SVG (viewBox 0 0 24 24), не более двух
 * Path, без stroke-деталей: лаконичная геометрия вместо
 * детализации (правило Промта 15). Цвет заливки передаётся
 * снаружи — компонент не знает о теме.
 */
import { Svg, Path } from 'react-native-svg';
import { placeholderPalette } from './palette';
import type { SilhouetteProps } from './props';

export function SilhouetteApple({
  size = 24,
  color = placeholderPalette.shapeLight,
}: SilhouetteProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 7.3C14.8 5.1 19.8 6.8 19.8 11.3c0 4.4-3.4 9.1-7.8 9.1s-7.8-4.7-7.8-9.1c0-4.5 5-6.2 7.8-4Z"
        fill={color}
      />
    </Svg>
  );
}
