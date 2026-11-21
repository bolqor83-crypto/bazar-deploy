/**
 * VolumeChart — простой горизонтальный бар-чарт объёмов
 * (Промт 18, D). Кастомный SVG без тяжёлых библиотек: имя товара,
 * значение, полоса пропорционально максимуму.
 */
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '../../theme';
import { Text } from '../Text';

export interface VolumeChartItem {
  productName: string;
  quantity: number;
  unit: string;
}

export interface VolumeChartProps {
  items: VolumeChartItem[];
  testID?: string;
}

/** Высота полосы, dp. */
const BAR_HEIGHT = 10;

/**
 * Единица продукта в seed — «1 кг» (шаг фасовки). В аналитике
 * количество уже в этих единицах: показываем «40 кг», без «1».
 */
function formatUnit(unit: string): string {
  return unit.replace(/^1\s+/, '');
}

export function VolumeChart({ items, testID }: VolumeChartProps) {
  const { colors, spacing, radii } = useTheme();
  const max = Math.max(...items.map((i) => i.quantity), 1);

  return (
    <View testID={testID} style={{ gap: spacing.md }}>
      {items.map((item, index) => {
        const share = item.quantity / max;
        const widthPercent = Math.max(share, 0.02);
        return (
          <View
            key={`${item.productName}-${index}`}
            accessibilityLabel={`${item.productName}: ${item.quantity} ${formatUnit(item.unit)}`}
            style={{ gap: 4 }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: spacing.sm,
              }}
            >
              <Text variant="bodySmall" numberOfLines={1} style={{ flex: 1 }}>
                {item.productName}
              </Text>
              <Text
                variant="bodySmall"
                color="textSecondary"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {`${item.quantity} ${formatUnit(item.unit)}`.trim()}
              </Text>
            </View>
            <Svg height={BAR_HEIGHT} width="100%" preserveAspectRatio="none">
              <Rect
                x={0}
                y={0}
                width="100%"
                height={BAR_HEIGHT}
                rx={radii.sm}
                fill={colors.surfaceMuted}
              />
              <Rect
                x={0}
                y={0}
                width={`${widthPercent * 100}%`}
                height={BAR_HEIGHT}
                rx={radii.sm}
                fill={colors.primary}
              />
            </Svg>
          </View>
        );
      })}
    </View>
  );
}
