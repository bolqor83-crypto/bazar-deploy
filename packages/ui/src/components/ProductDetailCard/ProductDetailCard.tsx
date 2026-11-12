/**
 * ProductDetailCard — карточка товара на экране детали.
 *
 * Бейджи (хит/скоропорт), название, описание, цена за единицу,
 * наличие, минимальная партия, продавец лучшего предложения и
 * список всех предложений продавцов (дешёвое первым). Данные
 * приходят пропсами с API каталога (Промт 8, Часть C).
 */
import { View } from 'react-native';
import { Store } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Badge } from '../Badge';
import { Card } from '../Card';
import { Divider } from '../Divider';
import { PriceDisplay } from '../PriceDisplay';
import { StockIndicator, type StockLevel } from '../StockIndicator';
import { Text } from '../Text';

/** «1 кг» → «кг»: для строки минимальной партии. */
export function unitShort(unit: string): string {
  return unit.startsWith('1 ') ? unit.slice(2) : unit;
}

export interface DetailOffer {
  id: string;
  organizationName: string;
  priceKopecks: number;
  stock: number;
  minQuantity: number;
}

export interface ProductDetailCardProps {
  name: string;
  description?: string;
  /** «1 кг», «500 г» — подставляется к цене. */
  unit: string;
  /** Лучшая (минимальная) цена в копейках. */
  priceKopecks: number;
  stock: StockLevel;
  /** Минимальная партия лучшего предложения. */
  minQuantity?: number;
  /** Хит продаж (badge === 'hit' в API). */
  isHit?: boolean;
  isPerishable?: boolean;
  /** Продавец лучшего предложения. */
  sellerName: string;
  /** Все предложения: показываются списком, дешёвое первым. */
  offers?: DetailOffer[];
  testID?: string;
}

/** Уровень наличия по остатку на складе продавца. */
export function stockLevelFor(stock: number): StockLevel {
  if (stock <= 0) {
    return 'out';
  }
  return stock < 20 ? 'low' : 'in';
}

export function ProductDetailCard({
  name,
  description,
  unit,
  priceKopecks,
  stock,
  minQuantity,
  isHit = false,
  isPerishable = false,
  sellerName,
  offers = [],
  testID,
}: ProductDetailCardProps) {
  const { colors, radii, spacing } = useTheme();

  const hasBadges = isHit || isPerishable;

  return (
    <Card testID={testID}>
      <View style={{ gap: spacing.sm }}>
        {hasBadges ? (
          <View style={{ flexDirection: 'row', gap: spacing.xs + 2 }}>
            {isHit ? <Badge variant="warning">Хит</Badge> : null}
            {isPerishable ? <Badge variant="neutral">Скоропорт</Badge> : null}
          </View>
        ) : null}

        <Text variant="h2">{name}</Text>

        {description ? (
          <Text variant="bodySmall" color="textSecondary">
            {description}
          </Text>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: spacing.xs + 2,
          }}
        >
          <PriceDisplay value={priceKopecks} size="lg" />
          <Text variant="bodySmall" color="textSecondary">
            за {unit}
          </Text>
        </View>

        <StockIndicator stock={stock} />

        {minQuantity && minQuantity > 1 ? (
          <Text variant="caption" color="textMuted">
            Минимальная партия — {minQuantity} × {unitShort(unit)}
          </Text>
        ) : null}

        <Divider />

        <Text variant="caption" color="textMuted">
          Продавец
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            padding: spacing.md,
            backgroundColor: colors.surfaceMuted,
            borderRadius: radii.sm,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Store size={20} color={colors.primaryText} />
          </View>
          <View style={{ gap: 2 }}>
            <Text variant="bodyStrong">{sellerName}</Text>
            <Text variant="caption" color="textSecondary">
              Лучшее предложение
            </Text>
          </View>
        </View>

        {offers.length > 1 ? (
          <View style={{ gap: spacing.xs }}>
            <Text variant="caption" color="textMuted">
              Все предложения ({offers.length})
            </Text>
            {offers.map((offer) => (
              <View
                key={offer.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 44,
                  gap: spacing.sm,
                }}
              >
                <Text
                  variant="bodySmall"
                  color={
                    offer.organizationName === sellerName
                      ? 'primaryText'
                      : 'text'
                  }
                  style={{ flexShrink: 1 }}
                  numberOfLines={1}
                >
                  {offer.organizationName}
                </Text>
                <Text variant="bodySmall" color="textSecondary">
                  склад {offer.stock}
                </Text>
                <PriceDisplay value={offer.priceKopecks} />
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Card>
  );
}
