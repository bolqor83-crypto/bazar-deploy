/**
 * SilhouetteOnion — силуэт: лук (Промт 16, Часть A).
 *
 * Одноцветный filled-SVG (viewBox 0 0 24 24), не более двух
 * Path, без stroke-деталей: лаконичная геометрия вместо
 * детализации (правило Промта 15). Цвет заливки передаётся
 * снаружи — компонент не знает о теме.
 */
import { Svg, Path } from 'react-native-svg';
import { placeholderPalette } from './palette';
import type { SilhouetteProps } from './props';

export function SilhouetteOnion({
  size = 24,
  color = placeholderPalette.shapeLight,
}: SilhouetteProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.8c4.5 2 7.3 6.5 7.3 10.7 0 4.2-3 7.1-7.3 7.1s-7.3-2.9-7.3-7.1c0-4.2 2.8-8.7 7.3-10.7Z"
        fill={color}
      />
      <Path
        d="M10.6 20.9c-.3.9-.9 1.4-1.9 1.6-.1-1 .3-1.8 1.1-2.4l.8.8Zm2.8 0c.3.9.9 1.4 1.9 1.6.1-1-.3-1.8-1.1-2.4l-.8.8Zm-1.4.2l.4 1.9h-.8l.4-1.9Z"
        fill={color}
      />
    </Svg>
  );
}
