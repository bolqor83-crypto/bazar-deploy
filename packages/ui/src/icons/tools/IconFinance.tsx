/**
 * IconFinance — инструмент «Финансы» (Промт 15, Часть A).
 *
 * Купюра: золотое полотно с тёмным кольцом и светлой меткой
 * в центре.
 */
import { Svg, Circle, Rect } from 'react-native-svg';
import { iconPalette } from '../palette';

export interface IconFinanceProps {
  size?: number;
}

export function IconFinance({ size = 24 }: IconFinanceProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Полотно купюры */}
      <Rect
        x={3.5}
        y={6.5}
        width={17}
        height={11}
        rx={1.5}
        fill={iconPalette.wheatGold}
      />
      {/* Кольцо */}
      <Circle cx={12} cy={12} r={3.4} fill={iconPalette.wheatGoldDark} />
      {/* Светлая метка в центре */}
      <Circle cx={12} cy={12} r={1.4} fill={iconPalette.milkWhite} />
    </Svg>
  );
}
