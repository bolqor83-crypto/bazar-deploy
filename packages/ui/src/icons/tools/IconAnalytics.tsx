/**
 * IconAnalytics — инструмент «Аналитика» (Промт 15, Часть A).
 *
 * Три растущих столбца: светлый, средний и фирменный зелёный —
 * рост показателей.
 */
import { Svg, Rect } from 'react-native-svg';
import { iconPalette } from '../palette';

export interface IconAnalyticsProps {
  size?: number;
}

export function IconAnalytics({ size = 24 }: IconAnalyticsProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={4.5}
        y={13}
        width={3.8}
        height={7}
        rx={1}
        fill={iconPalette.leafGreenLight}
      />
      <Rect
        x={10.1}
        y={9}
        width={3.8}
        height={11}
        rx={1}
        fill={iconPalette.leafGreen}
      />
      <Rect
        x={15.7}
        y={4.5}
        width={3.8}
        height={15.5}
        rx={1}
        fill={iconPalette.buyerGreen}
      />
    </Svg>
  );
}
