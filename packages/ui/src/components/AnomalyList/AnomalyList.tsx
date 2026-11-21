/**
 * AnomalyList — список аномалий рынка (Промт 18, D):
 * тип (всплеск/падение цены или объёма), сущность, значение и
 * Z-score. Спокойные цвета: рост — success, падение — terracotta.
 */
import { View } from 'react-native';
import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { formatPrice } from '../PriceDisplay/PriceDisplay';
import { Badge } from '../Badge';
import { Text } from '../Text';

export interface AnomalyItemData {
  type: 'price_spike' | 'price_drop' | 'volume_spike' | 'volume_drop';
  entity: string;
  value: number;
  zScore: number;
  unit?: string;
}

export interface AnomalyListProps {
  items: AnomalyItemData[];
  testID?: string;
}

const META: Record<
  AnomalyItemData['type'],
  { label: string; icon: LucideIcon; tone: 'success' | 'danger' }
> = {
  price_spike: { label: 'Цена ↑', icon: TrendingUp, tone: 'success' },
  price_drop: { label: 'Цена ↓', icon: TrendingDown, tone: 'danger' },
  volume_spike: { label: 'Объём ↑', icon: TrendingUp, tone: 'success' },
  volume_drop: { label: 'Объём ↓', icon: TrendingDown, tone: 'danger' },
};

export function AnomalyList({ items, testID }: AnomalyListProps) {
  const { colors, spacing, radii } = useTheme();

  if (items.length === 0) {
    return (
      <Text variant="bodySmall" color="textSecondary">
        Резких отклонений нет — рынок спокоен.
      </Text>
    );
  }

  /** Цена — в рублях, объём — как есть (юнит «1 кг» → «кг»). */
  const valueText = (item: AnomalyItemData): string =>
    item.type.startsWith('price_')
      ? formatPrice(item.value)
      : `${item.value}${item.unit ? ` ${item.unit.replace(/^1\s+/, '')}` : ''}`;

  return (
    <View testID={testID} style={{ gap: spacing.sm }}>
      {items.map((item, index) => {
        const meta = META[item.type];
        const Icon = meta.icon;
        const toneColor =
          meta.tone === 'success' ? colors.success : colors.danger;
        return (
          <View
            key={`${item.entity}-${index}`}
            accessibilityLabel={`Аномалия: ${meta.label} ${item.entity}, значение ${valueText(item)}, отклонение ${item.zScore}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              backgroundColor: colors.backgroundElevated,
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.md,
            }}
          >
            <Icon size={20} color={toneColor} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {item.entity}
              </Text>
              <Text
                variant="caption"
                color="textMuted"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {`${valueText(item)} · отклонение ${item.zScore
                  .toFixed(1)
                  .replace('.', ',')}σ`}
              </Text>
            </View>
            <Badge variant={meta.tone}>{meta.label}</Badge>
          </View>
        );
      })}
    </View>
  );
}
