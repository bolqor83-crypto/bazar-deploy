/**
 * SilhouetteGreensBunch — силуэт: пучок зелени (Промт 16, Часть A).
 *
 * Одноцветный filled-SVG (viewBox 0 0 24 24), не более двух
 * Path, без stroke-деталей: лаконичная геометрия вместо
 * детализации (правило Промта 15). Цвет заливки передаётся
 * снаружи — компонент не знает о теме.
 */
import { Svg, Path } from 'react-native-svg';
import { placeholderPalette } from './palette';
import type { SilhouetteProps } from './props';

export function SilhouetteGreensBunch({
  size = 24,
  color = placeholderPalette.shapeLight,
}: SilhouetteProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.7c2.6 0 4.4 1.2 5.6 3.2.9 1.5 1.1 3.3.6 5-.4 1.4-1.3 2.4-2.6 2.8.5-1.5.4-2.9-.4-4.2-.4 2.1-1.5 3.6-3.2 4.3-1.7-.7-2.8-2.2-3.2-4.3-.8 1.3-.9 2.7-.4 4.2-1.3-.4-2.2-1.4-2.6-2.8-.5-1.7-.3-3.5.6-5 1.2-2 3-3.2 5.6-3.2Z"
        fill={color}
      />
      <Path d="M9.7 13.2h4.6l.8 6.4c-2 .7-4.2.7-6.2 0l.8-6.4Z" fill={color} />
    </Svg>
  );
}
