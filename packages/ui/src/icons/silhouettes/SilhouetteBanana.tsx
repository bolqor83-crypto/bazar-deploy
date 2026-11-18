/**
 * SilhouetteBanana — силуэт: банан (Промт 16, Часть A).
 *
 * Одноцветный filled-SVG (viewBox 0 0 24 24), не более двух
 * Path, без stroke-деталей: лаконичная геометрия вместо
 * детализации (правило Промта 15). Цвет заливки передаётся
 * снаружи — компонент не знает о теме.
 */
import { Svg, Path } from 'react-native-svg';
import { placeholderPalette } from './palette';
import type { SilhouetteProps } from './props';

export function SilhouetteBanana({
  size = 24,
  color = placeholderPalette.shapeLight,
}: SilhouetteProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.5 6.3c-.8-.3-1.2-1.2-.8-2 .3-.5.8-.7 1.4-.6 4.9.7 9.1 2.7 11.9 6.3 1.9 2.5 2.8 5.4 2.5 8.3-.1 1-.9 1.6-1.8 1.4-.8-.2-1.3-1-1.1-1.8.3-2.3-.5-4.5-2-6.5-2.3-2.9-5.9-4.6-10.1-5.1Z"
        fill={color}
      />
    </Svg>
  );
}
