/**
 * SilhouetteGrapes — силуэт: виноград (Промт 16, Часть A).
 *
 * Одноцветный filled-SVG (viewBox 0 0 24 24), не более двух
 * Path, без stroke-деталей: лаконичная геометрия вместо
 * детализации (правило Промта 15). Цвет заливки передаётся
 * снаружи — компонент не знает о теме.
 */
import { Svg, Path } from 'react-native-svg';
import { placeholderPalette } from './palette';
import type { SilhouetteProps } from './props';

export function SilhouetteGrapes({
  size = 24,
  color = placeholderPalette.shapeLight,
}: SilhouetteProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.9 7.4a2.1 2.1 0 1 0 4.2 0 2.1 2.1 0 1 0-4.2 0ZM12.9 7.4a2.1 2.1 0 1 0 4.2 0 2.1 2.1 0 1 0-4.2 0ZM9.9 10.2a2.1 2.1 0 1 0 4.2 0 2.1 2.1 0 1 0-4.2 0ZM6.6 12.6a2.1 2.1 0 1 0 4.2 0 2.1 2.1 0 1 0-4.2 0ZM13.2 12.6a2.1 2.1 0 1 0 4.2 0 2.1 2.1 0 1 0-4.2 0ZM9.9 15.2a2.1 2.1 0 1 0 4.2 0 2.1 2.1 0 1 0-4.2 0ZM7.3 17.6a2.1 2.1 0 1 0 4.2 0 2.1 2.1 0 1 0-4.2 0ZM12.5 17.6a2.1 2.1 0 1 0 4.2 0 2.1 2.1 0 1 0-4.2 0ZM9.9 19.9a2.1 2.1 0 1 0 4.2 0 2.1 2.1 0 1 0-4.2 0Z"
        fill={color}
      />
      <Path
        d="M11.6 5.4c.1-1.4.8-2.3 2.1-2.8.5 1.1-.1 2.2-1 2.9h-1.1Z"
        fill={color}
      />
    </Svg>
  );
}
