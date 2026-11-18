/**
 * SilhouetteLettuceHead — силуэт: головка салата (Промт 16, Часть A).
 *
 * Одноцветный filled-SVG (viewBox 0 0 24 24), не более двух
 * Path, без stroke-деталей: лаконичная геометрия вместо
 * детализации (правило Промта 15). Цвет заливки передаётся
 * снаружи — компонент не знает о теме.
 */
import { Svg, Path } from 'react-native-svg';
import { placeholderPalette } from './palette';
import type { SilhouetteProps } from './props';

export function SilhouetteLettuceHead({
  size = 24,
  color = placeholderPalette.shapeLight,
}: SilhouetteProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.8c1.5 0 2.4.8 3.4 1.2 1.2.5 2.5.4 3.4 1.4.9 1 .8 2.3 1.3 3.5.4 1.1 1.3 2 1.3 3.3 0 1.3-.9 2.2-1.3 3.3-.5 1.2-.4 2.5-1.3 3.5-.9 1-2.2.9-3.4 1.4-1 .4-1.9 1.2-3.4 1.2s-2.4-.8-3.4-1.2c-1.2-.5-2.5-.4-3.4-1.4-.9-1-.8-2.3-1.3-3.5-.4-1.1-1.3-2-1.3-3.3 0-1.3.9-2.2 1.3-3.3.5-1.2.4-2.5 1.3-3.5.9-1 2.2-.9 3.4-1.4 1-.4 1.9-1.2 3.4-1.2Z"
        fill={color}
      />
    </Svg>
  );
}
