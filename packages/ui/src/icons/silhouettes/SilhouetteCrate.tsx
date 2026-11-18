/**
 * SilhouetteCrate — силуэт: ящик (универсальный fallback) (Промт 16, Часть A).
 *
 * Одноцветный filled-SVG (viewBox 0 0 24 24), не более двух
 * Path, без stroke-деталей: лаконичная геометрия вместо
 * детализации (правило Промта 15). Цвет заливки передаётся
 * снаружи — компонент не знает о теме.
 */
import { Svg, Path } from 'react-native-svg';
import { placeholderPalette } from './palette';
import type { SilhouetteProps } from './props';

export function SilhouetteCrate({
  size = 24,
  color = placeholderPalette.shapeLight,
}: SilhouetteProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 4.5h18c.7 0 1.2.5 1.2 1.2v1.5H1.8V5.7c0-.7.5-1.2 1.2-1.2Z"
        fill={color}
      />
      <Path
        d="M3.6 8.1h16.8v10.6c0 1.6-1.3 2.9-2.9 2.9H6.5c-1.6 0-2.9-1.3-2.9-2.9V8.1ZM5.4 10.4h13.2v1.9H5.4ZM5.4 14h13.2v1.9H5.4Z"
        fillRule="evenodd"
        fill={color}
      />
    </Svg>
  );
}
