/**
 * OfferRow — строка предложения в кабинете продавца (Промт 10).
 *
 * Плотность рабочего инструмента: высота ряда 64–72 px, фото 48×48
 * (или плейсхолдер), название, цена табличными цифрами, склад и
 * бейдж. Только презентация; действия — снаружи (swipe / кнопки).
 */
import { View, Image, Pressable } from 'react-native';
import { Package } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Badge } from '../Badge';
import { Text } from '../Text';
import { formatPrice } from '../PriceDisplay';

export interface OfferRowProps {
  /** Название товара. */
  title: string;
  /** Единица измерения: «кг», «шт». */
  unit?: string;
  /** Цена в копейках. */
  priceKopecks: number;
  /** Остаток на складе. */
  stock: number;
  /** Минимальная партия. */
  minQuantity?: number;
  /** Бейдж: hit / new / discount. */
  badge?: string | null;
  /** Первое фото (URL) или null — плейсхолдер. */
  imageUrl?: string | null;
  /** Архивное предложение — приглушение. */
  archived?: boolean;
  onPress?: () => void;
  testID?: string;
}

const BADGE_LABELS: Record<string, string> = {
  hit: 'Хит',
  new: 'Новинка',
  discount: 'Скидка',
};

export function OfferRow({
  title,
  unit,
  priceKopecks,
  stock,
  minQuantity,
  badge,
  imageUrl,
  archived = false,
  onPress,
  testID,
}: OfferRowProps) {
  const { colors, spacing, radii } = useTheme();

  const stockLabel =
    stock === 0 ? 'Склад: 0' : `Склад: ${stock}${unit ? ` ${unit}` : ''}`;

  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: 64,
        paddingVertical: spacing.sm,
        opacity: archived ? 0.6 : 1,
      }}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{
            width: 48,
            height: 48,
            borderRadius: radii.sm,
            backgroundColor: colors.surface,
          }}
          accessibilityLabel={`Фото: ${title}`}
        />
      ) : (
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: radii.sm,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityLabel="Фото не загружено"
        >
          <Package size={22} color={colors.textMuted} />
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text
            variant="bodySmall"
            numberOfLines={1}
            style={{ flexShrink: 1 }}
          >
            {title}
          </Text>
          {badge && BADGE_LABELS[badge] ? (
            <Badge variant="warning" size="sm">
              {BADGE_LABELS[badge]}
            </Badge>
          ) : null}
        </View>
        <Text variant="caption" color="textSecondary" mono>
          {[
            stockLabel,
            minQuantity && minQuantity > 1
              ? `мин. ${minQuantity}${unit ? ` ${unit}` : ''}`
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
      <Text variant="body" mono style={{ color: colors.text }}>
        {formatPrice(priceKopecks)}
      </Text>
    </View>
  );

  if (!onPress) {
    return (
      <View testID={testID} accessibilityLabel={`${title}, ${stockLabel}`}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${stockLabel}, ${formatPrice(priceKopecks)}`}
      hitSlop={4}
    >
      {body}
    </Pressable>
  );
}
