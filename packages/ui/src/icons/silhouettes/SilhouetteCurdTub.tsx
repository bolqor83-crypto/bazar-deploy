/**
 * SilhouetteCurdTub — силуэт: упаковка творога (Промт 16, Часть A).
 *
 * Одноцветный filled-SVG (viewBox 0 0 24 24), не более двух
 * Path, без stroke-деталей: лаконичная геометрия вместо
 * детализации (правило Промта 15). Цвет заливки передаётся
 * снаружи — компонент не знает о теме.
 */
import { Svg, Path } from 'react-native-svg';
import { placeholderPalette } from './palette';
import type { SilhouetteProps } from './props';

export function SilhouetteCurdTub({
  size = 24,
  color = placeholderPalette.shapeLight,
}: SilhouetteProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.3 4.9h11.4c.8 0 1.4.6 1.4 1.4v.8c0 .8-.6 1.4-1.4 1.4H6.3c-.8 0-1.4-.6-1.4-1.4v-.8c0-.8.6-1.4 1.4-1.4Z"
        fill={color}
      />
      <Path
        d="M5.3 9.4h13.4l-1.2 10c-.1 1.2-1.1 2.1-2.3 2.1H8.8c-1.2 0-2.2-.9-2.3-2.1l-1.2-10Z"
        fill={color}
      />
    </Svg>
  );
}
