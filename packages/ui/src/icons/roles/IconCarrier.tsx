/**
 * IconCarrier — роль «Перевозчик» (Промт 15, Часть A).
 *
 * Грузовик: синий кузов и кабина с окном, коричневые колёса.
 */
import { Svg, Path, Circle, Rect } from 'react-native-svg';
import { iconPalette } from '../palette';

export interface IconCarrierProps {
  size?: number;
}

export function IconCarrier({ size = 24 }: IconCarrierProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Кузов */}
      <Rect
        x={3}
        y={7.5}
        width={10.5}
        height={9}
        rx={1}
        fill={iconPalette.carrierBlue}
      />
      {/* Кабина */}
      <Path
        d="M13.5 10H17.2L20 13V16.5H13.5V10Z"
        fill={iconPalette.carrierBlue}
      />
      {/* Окно кабины */}
      <Path d="M15 11.2H16.9L18.6 13.3H15V11.2Z" fill={iconPalette.milkWhite} />
      {/* Колёса */}
      <Circle cx={7} cy={18.4} r={2} fill={iconPalette.boxBrown} />
      <Circle cx={16.6} cy={18.4} r={2} fill={iconPalette.boxBrown} />
    </Svg>
  );
}
