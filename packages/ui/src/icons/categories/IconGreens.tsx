/**
 * IconGreens — категория «Зелень» (Промт 15, Часть A).
 *
 * Пучок зелени: центральный лист темнее, боковые светлее,
 * черенки собраны внизу. Два оттенка зелёного.
 */
import { Svg, Path } from 'react-native-svg';
import { iconPalette } from '../palette';

export interface IconGreensProps {
  size?: number;
}

export function IconGreens({ size = 24 }: IconGreensProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Центральный лист */}
      <Path
        d="M12 3C14.4 6 14.4 11 12 14.2C9.6 11 9.6 6 12 3Z"
        fill={iconPalette.leafGreen}
      />
      {/* Боковые листья — светлый тон */}
      <Path
        d="M5.8 5.2C8.8 6.2 10.3 9.6 9.3 13.1C6.3 12.1 4.8 8.7 5.8 5.2Z"
        fill={iconPalette.leafGreenLight}
      />
      <Path
        d="M18.2 5.2C15.2 6.2 13.7 9.6 14.7 13.1C17.7 12.1 19.2 8.7 18.2 5.2Z"
        fill={iconPalette.leafGreenLight}
      />
      {/* Черенки */}
      <Path
        fill="none"
        d="M12 14.5L12 19M9.4 13.4L8.2 17.4M14.6 13.4L15.8 17.4"
        stroke={iconPalette.stemBrown}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}
