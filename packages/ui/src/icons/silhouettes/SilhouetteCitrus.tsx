/**
 * SilhouetteCitrus — силуэт: цитрус (апельсин/мандарин/лимон) (Промт 16, Часть A).
 *
 * Одноцветный filled-SVG (viewBox 0 0 24 24), не более двух
 * Path, без stroke-деталей: лаконичная геометрия вместо
 * детализации (правило Промта 15). Цвет заливки передаётся
 * снаружи — компонент не знает о теме.
 */
import { Svg, Path } from 'react-native-svg';
import { placeholderPalette } from './palette';
import type { SilhouetteProps } from './props';

export function SilhouetteCitrus({
  size = 24,
  color = placeholderPalette.shapeLight,
}: SilhouetteProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20.7c-4.3 0-7.5-3-7.5-7.1S7.7 6.5 12 6.5s7.5 3 7.5 7.1-3.2 7.1-7.5 7.1Z"
        fill={color}
      />
      <Path
        d="M14.3 5.1c1.5-2 4.1-1.6 4.7-.5-.9 1.7-3.5 1.8-4.7.5Z"
        fill={color}
      />
    </Svg>
  );
}
