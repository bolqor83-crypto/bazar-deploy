/**
 * SilhouettePotato — силуэт: картофель (Промт 16, Часть A).
 *
 * Одноцветный filled-SVG (viewBox 0 0 24 24), не более двух
 * Path, без stroke-деталей: лаконичная геометрия вместо
 * детализации (правило Промта 15). Цвет заливки передаётся
 * снаружи — компонент не знает о теме.
 */
import { Svg, Path } from 'react-native-svg';
import { placeholderPalette } from './palette';
import type { SilhouetteProps } from './props';

export function SilhouettePotato({
  size = 24,
  color = placeholderPalette.shapeLight,
}: SilhouetteProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12.8 5C17 3.6 21.3 6.4 21.5 10.6c.2 4.3-2 9.3-6.5 10.5-4.5 1.2-9.3-1.5-10.2-5.8C4 11.4 7.6 6.9 12.8 5Z M9.9 9.9a1.3 1.3 0 1 0 2.6 0 1.3 1.3 0 1 0-2.6 0Z M14.3 14a1.3 1.3 0 1 0 2.6 0 1.3 1.3 0 1 0-2.6 0Z"
        fillRule="evenodd"
        fill={color}
      />
    </Svg>
  );
}
