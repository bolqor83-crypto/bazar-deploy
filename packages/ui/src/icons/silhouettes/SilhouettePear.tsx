/**
 * SilhouettePear — силуэт: груша (Промт 16, Часть A).
 *
 * Одноцветный filled-SVG (viewBox 0 0 24 24), не более двух
 * Path, без stroke-деталей: лаконичная геометрия вместо
 * детализации (правило Промта 15). Цвет заливки передаётся
 * снаружи — компонент не знает о теме.
 */
import { Svg, Path } from 'react-native-svg';
import { placeholderPalette } from './palette';
import type { SilhouetteProps } from './props';

export function SilhouettePear({
  size = 24,
  color = placeholderPalette.shapeLight,
}: SilhouetteProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.3c1.8 0 3 1.3 3 3 0 1.1-.4 2-.8 2.9-.3.9-.5 1.7-.5 2.6 0 1.4.6 2.5 1.5 3.7 1 1.3 1.9 2.7 1.9 4.5 0 2.8-2.1 5-5.1 5s-5.1-2.2-5.1-5c0-1.8.9-3.2 1.9-4.5.9-1.2 1.5-2.3 1.5-3.7 0-.9-.2-1.7-.5-2.6-.4-.9-.8-1.8-.8-2.9 0-1.7 1.2-3 3-3Z"
        fill={color}
      />
    </Svg>
  );
}
