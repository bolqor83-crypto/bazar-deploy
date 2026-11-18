/**
 * SilhouetteCheeseWedge — силуэт: клин сыра (Промт 16, Часть A).
 *
 * Одноцветный filled-SVG (viewBox 0 0 24 24), не более двух
 * Path, без stroke-деталей: лаконичная геометрия вместо
 * детализации (правило Промта 15). Цвет заливки передаётся
 * снаружи — компонент не знает о теме.
 */
import { Svg, Path } from 'react-native-svg';
import { placeholderPalette } from './palette';
import type { SilhouetteProps } from './props';

export function SilhouetteCheeseWedge({
  size = 24,
  color = placeholderPalette.shapeLight,
}: SilhouetteProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5.6 19.6h14.2a1.6 1.6 0 0 0 1.6-1.6V10.4L4.9 17.9c-1.2.8-.6 1.7.7 1.7ZM12.8 15.6a1.7 1.7 0 1 0 3.4 0 1.7 1.7 0 1 0-3.4 0ZM17.4 13.2a1.2 1.2 0 1 0 2.4 0 1.2 1.2 0 1 0-2.4 0ZM9.3 17.2a.9.9 0 1 0 1.8 0 .9.9 0 1 0-1.8 0Z"
        fillRule="evenodd"
        fill={color}
      />
    </Svg>
  );
}
