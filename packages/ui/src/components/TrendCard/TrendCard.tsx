/**
 * TrendCard — карточка тренда цены по категории (Промт 18, D).
 *
 * Крупная цифра (numberL, tabular), % изменения со стрелкой:
 * рост — success (зелёный), падение — terracotta (не красный),
 * null — прочерк: изменение неизвестно, не выдумываем.
 */
import { View } from 'react-native';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { formatPrice } from '../PriceDisplay/PriceDisplay';
import { Text } from '../Text';

export interface TrendCardProps {
  categoryName: string;
  /** Средняя цена активных офферов, копейки. */
  avgPriceKopecks: number;
  /** Изменение к предыдущему окну, %; null — нет истории. */
  changePercent: number | null;
  /** Число офферов в среднем. */
  offers: number;
  /** Подпись окна. */
  periodLabel?: string;
  testID?: string;
}

export function TrendCard({
  categoryName,
  avgPriceKopecks,
  changePercent,
  offers,
  periodLabel,
  testID,
}: TrendCardProps) {
  const { colors, spacing, radii } = useTheme();

  const rising = changePercent !== null && changePercent > 0;
  const falling = changePercent !== null && changePercent < 0;
  const deltaColor = rising
    ? colors.success
    : falling
      ? colors.danger
      : colors.textMuted;
  const DeltaIcon = rising ? TrendingUp : falling ? TrendingDown : Minus;
  const deltaText =
    changePercent === null
      ? '—'
      : `${rising ? '+' : ''}${changePercent.toFixed(1).replace('.', ',')}%`;

  return (
    <View
      testID={testID}
      accessibilityLabel={`Тренд ${categoryName}: средняя ${formatPrice(avgPriceKopecks)}, изменение ${deltaText}`}
      style={{
        flex: 1,
        minWidth: 140,
        backgroundColor: colors.backgroundElevated,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: spacing.xs,
      }}
    >
      <Text variant="caption" color="textSecondary" numberOfLines={1}>
        {categoryName}
      </Text>
      <Text variant="numberL" style={{ fontVariant: ['tabular-nums'] }}>
        {formatPrice(avgPriceKopecks)}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {changePercent !== null ? (
          <DeltaIcon size={16} color={deltaColor} />
        ) : null}
        <Text
          variant="bodySmall"
          style={{ color: deltaColor, fontVariant: ['tabular-nums'] }}
        >
          {deltaText}
        </Text>
      </View>
      <Text
        variant="caption"
        color="textMuted"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {`${offers} предл.${periodLabel ? ` · ${periodLabel}` : ''}`}
      </Text>
    </View>
  );
}
