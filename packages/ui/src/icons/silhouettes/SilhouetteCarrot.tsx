/**
 * SilhouetteCarrot — силуэт: морковь (Промт 16, Часть A).
 *
 * Одноцветный filled-SVG (viewBox 0 0 24 24), не более двух
 * Path, без stroke-деталей: лаконичная геометрия вместо
 * детализации (правило Промта 15). Цвет заливки передаётся
 * снаружи — компонент не знает о теме.
 */
import { Svg, Path } from 'react-native-svg';
import { placeholderPalette } from './palette';
import type { SilhouetteProps } from './props';

export function SilhouetteCarrot({
  size = 24,
  color = placeholderPalette.shapeLight,
}: SilhouetteProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21.9c-1-2.1-4.6-9.4-4.6-12.3 0-1.9 1.1-3 4.6-3s4.6 1.1 4.6 3c0 2.9-3.6 10.2-4.6 12.3Z"
        fill={color}
      />
      <Path
        d="M11.9 6.4C9.5 6.1 7.9 4.9 7.2 2.7c2.4-.2 4 1 4.7 3.7Zm.2 0c2.4-.3 4-1.5 4.7-3.7-2.4-.2-4 1-4.7 3.7Z"
        fill={color}
      />
    </Svg>
  );
}
