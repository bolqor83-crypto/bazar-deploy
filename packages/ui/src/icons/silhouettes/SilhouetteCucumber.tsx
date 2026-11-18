/**
 * SilhouetteCucumber — силуэт: огурец (Промт 16, Часть A).
 *
 * Одноцветный filled-SVG (viewBox 0 0 24 24), не более двух
 * Path, без stroke-деталей: лаконичная геометрия вместо
 * детализации (правило Промта 15). Цвет заливки передаётся
 * снаружи — компонент не знает о теме.
 */
import { Svg, Path } from 'react-native-svg';
import { placeholderPalette } from './palette';
import type { SilhouetteProps } from './props';

export function SilhouetteCucumber({
  size = 24,
  color = placeholderPalette.shapeLight,
}: SilhouetteProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 16.7L14.8 6.9a2.9 2.9 0 0 1 4.1 4.1L9.1 20.8A2.9 2.9 0 0 1 5 16.7Z"
        fill={color}
      />
      <Path
        d="M19.1 6.6c.3-1 1-1.6 2.1-1.8.2 1.1-.1 2-.9 2.7l-1.2-.9Z"
        fill={color}
      />
    </Svg>
  );
}
