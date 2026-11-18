/**
 * IconCarrot — категория «Овощи» (Промт 15, Часть A).
 *
 * Морковь: оранжевое тело со скруглённым кончиком + три зелёных
 * листика. Минимализм = свежесть: простые узнаваемые формы.
 */
import { Svg, Path } from 'react-native-svg';
import { iconPalette } from '../palette';

export interface IconCarrotProps {
  /** Сторона квадрата: 20 (чипы каталога), 24, 32 (шоукейс). */
  size?: number;
}

export function IconCarrot({ size = 24 }: IconCarrotProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Тело морковки */}
      <Path
        d="M9.5 8.5C9.5 6.8 14.5 6.8 14.5 8.5L12.9 19.2C12.75 20.3 11.25 20.3 11.1 19.2L9.5 8.5Z"
        fill={iconPalette.carrotBody}
      />
      {/* Хвостики */}
      <Path
        fill="none"
        d="M12 7L10 3.5M12 7L12 3M12 7L14 3.5"
        stroke={iconPalette.leafGreen}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
