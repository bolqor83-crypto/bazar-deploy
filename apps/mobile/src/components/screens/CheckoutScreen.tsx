/**
 * Оформление заказа (Промт 9, Часть D).
 *
 * Сводка корзины, адрес (readonly, «Изменить» → профиль), комментарий,
 * способ получения: самовывоз или доставка («Скоро» — disabled).
 * Создание: POST /api/orders → переход на карточку заказа + Toast.
 * Позиции разных продавцов → несколько заказов (группировка на
 * сервере); покупатель попадает на первый, Toast сообщает сколько.
 */
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, ChevronLeft, MapPin, Store } from 'lucide-react-native';
import {
  Button,
  Card,
  Divider,
  Input,
  Skeleton,
  Text,
  useToast,
  useTheme,
} from '@bazar/ui';
import { useCart } from '../../hooks/useCart';
import { useCreateOrder } from '../../hooks/useOrders';

function CheckoutSkeleton() {
  const { spacing } = useTheme();
  return (
    <View style={{ padding: spacing.lg, gap: spacing.md }}>
      <Skeleton height={120} />
      <Skeleton height={72} />
      <Skeleton height={72} />
    </View>
  );
}

export interface CheckoutScreenProps {
  basePath: 'customer' | 'store';
}

export default function CheckoutScreen({ basePath }: CheckoutScreenProps) {
  const router = useRouter();
  const { colors, spacing, radii } = useTheme();
  const { show } = useToast();
  const cartQuery = useCart();
  const createOrder = useCreateOrder();
  const [comment, setComment] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>(
    'pickup',
  );

  const cart = cartQuery.data;
  const items = cart?.items ?? [];

  const circleButton = (label: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => router.back()}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <ChevronLeft size={22} color={colors.text} />
    </Pressable>
  );

  const header = (
    <View
      style={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
      }}
    >
      {circleButton('Назад')}
      <Text variant="h2">Оформление заказа</Text>
    </View>
  );

  if (cartQuery.isPending || !cart) {
    return (
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {header}
        <CheckoutSkeleton />
      </ScrollView>
    );
  }

  if (items.length === 0) {
    return (
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {header}
        <Text
          variant="body"
          color="textSecondary"
          style={{ padding: spacing.lg }}
        >
          Корзина пуста — добавьте товары из каталога.
        </Text>
      </ScrollView>
    );
  }

  const goodsCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalRubles = Math.round(cart.subtotal / 100).toLocaleString('ru-RU');

  const submit = () => {
    createOrder.mutate(
      {
        items: items.map((item) => ({
          offerId: item.offer.id,
          quantity: item.quantity,
        })),
        comment: comment.trim() || undefined,
        deliveryMethod,
      },
      {
        onSuccess: (orders) => {
          const first = orders[0];
          show({
            variant: 'success',
            message:
              orders.length > 1
                ? `Создано заказов: ${orders.length}. Первый — ${first?.number}`
                : `Заказ ${first?.number} создан`,
          });
          if (first) {
            router.replace(`/customer/orders/${first.id}`);
          } else {
            router.replace('/' + basePath + '/orders');
          }
        },
        onError: () => {
          show({
            variant: 'info',
            message: 'Заказ не создан: проверьте наличие товаров',
          });
        },
      },
    );
  };

  const methodCard = (
    key: 'pickup' | 'delivery',
    Icon: typeof Store,
    title: string,
    description: string,
    disabled: boolean,
    testID: string,
  ) => {
    const selected = deliveryMethod === key;
    return (
      <Pressable
        key={key}
        testID={testID}
        accessibilityRole="radio"
        accessibilityState={{ selected, disabled }}
        accessibilityLabel={`${title}. ${description}`}
        disabled={disabled}
        onPress={() => setDeliveryMethod(key)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.md,
          borderWidth: 2,
          borderRadius: radii.lg,
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: colors.surface,
          opacity: disabled ? 0.55 : pressed ? 0.85 : 1,
          minHeight: 72,
        })}
      >
        <Icon
          size={22}
          color={selected ? colors.primary : colors.textSecondary}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong">{title}</Text>
          <Text variant="caption" color="textSecondary">
            {description}
          </Text>
        </View>
        {disabled ? (
          <Text variant="caption" color="textSecondary">
            Скоро
          </Text>
        ) : selected ? (
          <Check size={20} color={colors.primary} />
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.lg,
          paddingBottom: 140,
        }}
      >
        {/* Сводка корзины: компактно. */}
        <Card>
          <Text variant="bodyStrong" style={{ marginBottom: spacing.sm }}>
            {`Позиции (${items.length})`}
          </Text>
          {items.slice(0, 4).map((item) => (
            <View
              key={item.id}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: spacing.sm,
                paddingVertical: spacing.xs,
                minHeight: 28,
              }}
            >
              <Text variant="bodySmall" numberOfLines={1} style={{ flex: 1 }}>
                {`${item.offer.product.name} · ${item.quantity} ${item.offer.product.unit}`}
              </Text>
              <Text variant="bodySmall" mono>
                {`${Math.round(item.subtotal / 100).toLocaleString('ru-RU')} ₽`}
              </Text>
            </View>
          ))}
          {items.length > 4 ? (
            <Text variant="caption" color="textSecondary">
              {`Ещё ${items.length - 4} позиций`}
            </Text>
          ) : null}
          <Divider inset="none" style={{ marginVertical: spacing.sm }} />
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              minHeight: 28,
            }}
          >
            <Text variant="bodySmall" color="textSecondary">
              {`Товаров: ${goodsCount}`}
            </Text>
            <Text variant="bodyStrong" mono>
              {`${totalRubles} ₽`}
            </Text>
          </View>
        </Card>

        {/* Адрес: readonly + «Изменить» → профиль. */}
        <Card>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              marginBottom: spacing.xs,
            }}
          >
            <MapPin size={18} color={colors.textSecondary} />
            <Text variant="bodyStrong" style={{ flex: 1 }}>
              Адрес доставки
            </Text>
          </View>
          <Input value="Ростов-на-Дону, ул. Садовая, 12" editable={false} />
          <Button
            variant="ghost"
            size="sm"
            onPress={() => router.push('/' + basePath + '/profile')}
          >
            Изменить в профиле
          </Button>
        </Card>

        {/* Комментарий. */}
        <Card>
          <Text variant="bodyStrong" style={{ marginBottom: spacing.xs }}>
            Комментарий продавцу
          </Text>
          <Input
            value={comment}
            onChangeText={setComment}
            placeholder="Например: позвонить за час до готовности"
            multiline
            testID="checkout-comment"
          />
        </Card>

        {/* Способ получения. */}
        <View style={{ gap: spacing.sm }}>
          <Text variant="bodyStrong">Получение</Text>
          {methodCard(
            'pickup',
            Store,
            'Самовывоз с рынка',
            'Заберу сам со точки продавца',
            false,
            'checkout-pickup',
          )}
          {methodCard(
            'delivery',
            MapPin,
            'Доставка',
            'Курьер привезёт заказ на адрес',
            true,
            'checkout-delivery',
          )}
        </View>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          gap: spacing.sm,
          padding: spacing.lg,
          paddingBottom: spacing.xl,
          backgroundColor: colors.backgroundElevated,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            minHeight: 24,
          }}
        >
          <Text variant="bodySmall" color="textSecondary">
            Итого
          </Text>
          <Text variant="h3" mono testID="checkout-total">
            {`${totalRubles} ₽`}
          </Text>
        </View>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={submit}
          loading={createOrder.isPending}
          testID="checkout-submit"
        >
          Создать заказ
        </Button>
      </View>
    </View>
  );
}
