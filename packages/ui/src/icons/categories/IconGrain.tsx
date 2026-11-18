/**
 * IconGrain — категория «Крупы и злаки» (Промт 15, Часть A).
 *
 * Колос: золотые зёрна парами вдоль стебля, тёмный стебель
 * снизу, верхнее зерно замыкает силуэт.
 */
import { Svg, Path } from 'react-native-svg';
import { iconPalette } from '../palette';

export interface IconGrainProps {
  size?: number;
}

/** Зерно справа от стебля на высоте y. */
const grainRight = (y: number) =>
  `M12 ${y}C14 ${y - 0.5} 15.2 ${y - 2.3} 14.6 ${y - 4.3}C12.8 ${y - 3.7} 11.8 ${y - 1.9} 12 ${y}Z`;

/** Зерно слева от стебля на высоте y. */
const grainLeft = (y: number) =>
  `M12 ${y}C10 ${y - 0.5} 8.8 ${y - 2.3} 9.4 ${y - 4.3}C11.2 ${y - 3.7} 12.2 ${y - 1.9} 12 ${y}Z`;

export function IconGrain({ size = 24 }: IconGrainProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Стебель */}
      <Path
        fill="none"
        d="M12 21L12 8"
        stroke={iconPalette.wheatGoldDark}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
      {/* Пары зёрен */}
      <Path d={grainRight(10.8)} fill={iconPalette.wheatGold} />
      <Path d={grainLeft(10.8)} fill={iconPalette.wheatGold} />
      <Path d={grainRight(8.6)} fill={iconPalette.wheatGold} />
      <Path d={grainLeft(8.6)} fill={iconPalette.wheatGold} />
      <Path d={grainRight(6.4)} fill={iconPalette.wheatGold} />
      <Path d={grainLeft(6.4)} fill={iconPalette.wheatGold} />
      {/* Верхнее зерно */}
      <Path
        d="M12 6.2C13.5 5 13.8 3.4 12.9 2.2C11.4 3 11 4.7 12 6.2Z"
        fill={iconPalette.wheatGold}
      />
    </Svg>
  );
}
