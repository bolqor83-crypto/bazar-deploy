/**
 * SilhouetteCabbage — силуэт: капуста (Промт 16, Часть A).
 *
 * Одноцветный filled-SVG (viewBox 0 0 24 24), не более двух
 * Path, без stroke-деталей: лаконичная геометрия вместо
 * детализации (правило Промта 15). Цвет заливки передаётся
 * снаружи — компонент не знает о теме.
 */
import { Svg, Path } from 'react-native-svg';
import { placeholderPalette } from './palette';
import type { SilhouetteProps } from './props';

export function SilhouetteCabbage({
  size = 24,
  color = placeholderPalette.shapeLight,
}: SilhouetteProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.3c4.8 0 8.7 3.7 8.7 8.4 0 4.8-3.9 9-8.7 9s-8.7-4.2-8.7-9c0-4.7 3.9-8.4 8.7-8.4Z M9.9 13.6c-.6-2.4.6-4.7 2.7-5.7 1.6-.8 3.4-.6 4.7.5-1.5 0-3 .6-4.1 1.7-1.1 1.1-1.7 2.6-1.6 4.2-.6-.2-1.2-.4-1.7-.7Z"
        fillRule="evenodd"
        fill={color}
      />
    </Svg>
  );
}
