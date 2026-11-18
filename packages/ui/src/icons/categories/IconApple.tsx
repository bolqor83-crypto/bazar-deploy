/**
 * IconApple — категория «Фрукты» (Промт 15, Часть A).
 *
 * Яблоко: красное тело с классической выемкой сверху, зелёный
 * листик и коричневый черенок.
 */
import { Svg, Path } from 'react-native-svg';
import { iconPalette } from '../palette';

export interface IconAppleProps {
  size?: number;
}

export function IconApple({ size = 24 }: IconAppleProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Тело яблока */}
      <Path
        d="M12 7.5C14.8 5.2 19.8 7 19.8 11.4C19.8 15.8 16.4 20.5 12 20.5C7.6 20.5 4.2 15.8 4.2 11.4C4.2 7 9.2 5.2 12 7.5Z"
        fill={iconPalette.tomatoBody}
      />
      {/* Черенок */}
      <Path
        fill="none"
        d="M12 7C12 5.5 12.5 4.4 13.6 3.4"
        stroke={iconPalette.stemBrown}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {/* Листик */}
      <Path
        d="M13.8 5.6C15.2 3.6 17.7 4 18.3 5C17.4 6.6 14.9 6.7 13.8 5.6Z"
        fill={iconPalette.leafGreen}
      />
    </Svg>
  );
}
