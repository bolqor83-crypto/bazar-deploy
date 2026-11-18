/**
 * IconStoreOwner — роль «Владелец точки» (Промт 15, Часть A).
 *
 * Киоск: полосатый навес (тёплый беж чередуется со светлым),
 * бежевый корпус и витрина.
 */
import { Svg, Rect } from 'react-native-svg';
import { iconPalette } from '../palette';

export interface IconStoreOwnerProps {
  size?: number;
}

export function IconStoreOwner({ size = 24 }: IconStoreOwnerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Навес — чередование тёплых и светлых полос */}
      <Rect
        x={4}
        y={5}
        width={4}
        height={4.5}
        fill={iconPalette.storeOwnerWarm}
      />
      <Rect x={8} y={5} width={4} height={4.5} fill={iconPalette.milkWhite} />
      <Rect
        x={12}
        y={5}
        width={4}
        height={4.5}
        fill={iconPalette.storeOwnerWarm}
      />
      <Rect x={16} y={5} width={4} height={4.5} fill={iconPalette.milkWhite} />
      {/* Корпус */}
      <Rect
        x={5.5}
        y={9.5}
        width={13}
        height={10.5}
        rx={0.8}
        fill={iconPalette.boxBeige}
      />
      {/* Витрина */}
      <Rect
        x={8}
        y={12}
        width={8}
        height={4.5}
        rx={0.8}
        fill={iconPalette.milkWhite}
      />
    </Svg>
  );
}
