/**
 * DeliveryCard — способ получения заказа.
 *
 * Самовывоз (pickup) или доставка (delivery): иконка, название,
 * адрес/условия, время, стоимость (нет стоимости — «Бесплатно»).
 * Выбранный вариант подсвечивается границей бренда.
 */
import { View } from 'react-native';
import { Store, Truck } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Card } from '../Card';
import { formatPrice } from '../PriceDisplay';
import { Text } from '../Text';

export type DeliveryMethod = 'pickup' | 'delivery';

export interface DeliveryCardProps {
  method: DeliveryMethod;
  /** Свой заголовок; по умолчанию «Самовывоз» / «Доставка». */
  title?: string;
  /** Адрес точки (pickup) или адрес доставки (delivery). */
  address?: string;
  /** Время: «сегодня, 14:00–18:00». */
  time?: string;
  /** Стоимость в копейках; null или 0 — «Бесплатно». */
  priceKopecks?: number | null;
  selected?: boolean;
  onPress?: () => void;
}

const METHOD_META: Record<
  DeliveryMethod,
  { title: string; icon: typeof Store }
> = {
  pickup: { title: 'Самовывоз', icon: Store },
  delivery: { title: 'Доставка', icon: Truck },
};

export function DeliveryCard({
  method,
  title,
  address,
  time,
  priceKopecks = null,
  selected = false,
  onPress,
}: DeliveryCardProps) {
  const { colors, spacing } = useTheme();
  const meta = METHOD_META[method];
  const Icon = meta.icon;
  const heading = title ?? meta.title;
  const priceText =
    priceKopecks && priceKopecks > 0 ? formatPrice(priceKopecks) : 'Бесплатно';

  const body = (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.surfaceMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={24} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body">{heading}</Text>
        {address ? (
          <Text variant="caption" color="textSecondary" numberOfLines={2}>
            {address}
          </Text>
        ) : null}
        {time ? (
          <Text variant="caption" color="textMuted">
            {time}
          </Text>
        ) : null}
      </View>
      <Text
        variant="bodySmall"
        mono
        color={selected ? 'primaryText' : 'textSecondary'}
      >
        {priceText}
      </Text>
    </View>
  );

  return (
    <Card
      onPress={onPress}
      selected={selected}
      variant={selected ? 'outlined' : 'default'}
      style={selected ? { borderColor: colors.primary, borderWidth: 2 } : null}
    >
      {body}
    </Card>
  );
}
