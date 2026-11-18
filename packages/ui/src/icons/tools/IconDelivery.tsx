/**
 * IconDelivery — инструмент «Движения/доставка» (Промт 15, Часть A).
 *
 * Посылка со стрелкой: коробка со скотчем и синяя стрелка
 * движения вправо-вверх — перемещение товара.
 */
import { Svg, Path, Rect } from 'react-native-svg';
import { iconPalette } from '../palette';

export interface IconDeliveryProps {
  size?: number;
}

export function IconDelivery({ size = 24 }: IconDeliveryProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Коробка */}
      <Rect
        x={3.5}
        y={9.5}
        width={11.5}
        height={11}
        rx={1}
        fill={iconPalette.boxBeige}
      />
      {/* Скотч */}
      <Rect
        x={8.1}
        y={9.5}
        width={2.3}
        height={11}
        fill={iconPalette.boxBrown}
      />
      {/* Стрелка движения */}
      <Path
        fill="none"
        d="M15.5 8H21M21 8L18.6 5.4M21 8L18.6 10.6"
        stroke={iconPalette.carrierBlue}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
