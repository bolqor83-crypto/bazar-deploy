/**
 * SilhouetteBeet — силуэт: свёкла (Промт 16, Часть A).
 *
 * Одноцветный filled-SVG (viewBox 0 0 24 24), не более двух
 * Path, без stroke-деталей: лаконичная геометрия вместо
 * детализации (правило Промта 15). Цвет заливки передаётся
 * снаружи — компонент не знает о теме.
 */
import { Svg, Path } from 'react-native-svg';
import { placeholderPalette } from './palette';
import type { SilhouetteProps } from './props';

export function SilhouetteBeet({
  size = 24,
  color = placeholderPalette.shapeLight,
}: SilhouetteProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 9.3c3.7 0 6.6 2.7 6.6 6.1 0 3.3-2.7 5.7-4.7 8-.8.9-3 .9-3.8 0-2-2.3-4.7-4.7-4.7-8 0-3.4 2.9-6.1 6.6-6.1Z"
        fill={color}
      />
      <Path
        d="M11 9.1c-1.8-1.2-2.6-3-2.3-5.3 2.2.5 3.5 1.9 3.9 4.1L11 9.1Zm2 0c1.8-1.2 2.6-3 2.3-5.3-2.2.5-3.5 1.9-3.9 4.1L13 9.1Z"
        fill={color}
      />
    </Svg>
  );
}
