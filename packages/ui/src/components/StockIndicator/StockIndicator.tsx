/**
 * StockIndicator — наличие товара.
 *
 * Уровни: in («В наличии», success), low («Заканчивается»,
 * warning — янтарь), out («Нет в наличии», danger — терракота).
 * Красный запрещён правилами проекта.
 */
import { View } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../Text';

export type StockLevel = 'in' | 'low' | 'out';

export interface StockIndicatorProps {
  stock: StockLevel;
}

const STOCK_LABELS: Record<StockLevel, string> = {
  in: 'В наличии',
  low: 'Заканчивается',
  out: 'Нет в наличии',
};

export function StockIndicator({ stock }: StockIndicatorProps) {
  const { colors } = useTheme();

  const dotColor: Record<StockLevel, string> = {
    in: colors.success,
    low: colors.accent,
    out: colors.danger,
  };

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
      accessibilityLabel={`Наличие: ${STOCK_LABELS[stock]}`}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: dotColor[stock],
        }}
      />
      <Text variant="caption" color="textSecondary">
        {STOCK_LABELS[stock]}
      </Text>
    </View>
  );
}
