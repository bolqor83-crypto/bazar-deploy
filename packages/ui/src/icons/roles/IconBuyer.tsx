/**
 * IconBuyer — роль «Покупатель» (Промт 15, Часть A).
 *
 * Корзина покупателя в фирменном зелёном Bazar с белыми
 * прорезями — простая узнаваемая форма.
 */
import { Svg, Path } from 'react-native-svg';
import { iconPalette } from '../palette';

export interface IconBuyerProps {
  size?: number;
}

export function IconBuyer({ size = 24 }: IconBuyerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Ручки */}
      <Path
        fill="none"
        d="M8.5 9L10.6 4.6C11 3.7 12.4 3.7 12.8 4.6L15 9"
        stroke={iconPalette.buyerGreen}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {/* Тело корзины */}
      <Path
        d="M4.8 9H19.2L17.6 18.4C17.45 19.3 16.7 19.9 15.8 19.9H8.2C7.3 19.9 6.55 19.3 6.4 18.4L4.8 9Z"
        fill={iconPalette.buyerGreen}
      />
      {/* Прорези */}
      <Path
        fill="none"
        d="M9.5 12V17M14.5 12V17"
        stroke={iconPalette.milkWhite}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}
