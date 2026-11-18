/**
 * SilhouetteGrainSack — силуэт: мешок крупы (Промт 16, Часть A).
 *
 * Одноцветный filled-SVG (viewBox 0 0 24 24), не более двух
 * Path, без stroke-деталей: лаконичная геометрия вместо
 * детализации (правило Промта 15). Цвет заливки передаётся
 * снаружи — компонент не знает о теме.
 */
import { Svg, Path } from 'react-native-svg';
import { placeholderPalette } from './palette';
import type { SilhouetteProps } from './props';

export function SilhouetteGrainSack({
  size = 24,
  color = placeholderPalette.shapeLight,
}: SilhouetteProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5c3.5 0 6.4 3.9 6.4 9 0 4.4-2.6 7.9-6.4 7.9s-6.4-3.5-6.4-7.9c0-5.1 2.9-9 6.4-9Z"
        fill={color}
      />
      <Path
        d="M9.6 5.8c-.3-1.5.2-2.7 1.5-3.6.4 1.1.9 1.7 1.4 1.8.5-.1 1-.7 1.4-1.8 1.3.9 1.8 2.1 1.5 3.6-1.9.6-3.9.6-5.8 0Z"
        fill={color}
      />
    </Svg>
  );
}
