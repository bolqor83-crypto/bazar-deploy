/**
 * Корзина покупателя (Промт 9, Часть D).
 *
 * Позиции CartItemCard, sticky-итог внизу («Товаров/Позиций/Итого»
 * и primary-CTA «Оформить заказ»), пустая корзина с обещанием и
 * переходом в каталог, загрузка — Skeleton, ошибка — ErrorState.
 * «Очистить» — деструктивное вторичное действие с Dialog.
 */
import { useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ShoppingCart } from 'lucide-react-native';
import {
  Button,
  CartItemCard,
  Dialog,
  EmptyState,
  ErrorState,
  Skeleton,
  Text,
  useToast,
  useTheme,
} from '@bazar/ui';
import {
  useCart,
  useClearCart,
  useRemoveCartItem,
  useUpdateCartItem,
} from '../../hooks/useCart';

/** Скелетон корзины: три карточки. */
function CartSkeleton() {
  const { spacing } = useTheme();
  return (
    <View style={{ padding: spacing.lg, gap: spacing.md }}>
      <Skeleton height={96} />
      <Skeleton height={96} />
      <Skeleton height={96} />
    </View>
  );
}

export interface CartScreenProps {
  basePath: 'customer' | 'store';
}

export default function CartScreen({ basePath }: CartScreenProps) {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { show } = useToast();
  const cartQuery = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const clearCart = useClearCart();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const cart = cartQuery.data;
  const items = cart?.items ?? [];
  const goodsCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const warningByItem = new Map(
    (cart?.warnings ?? []).map((w) => [w.itemId, w.message]),
  );

  const header = (
    <View
      style={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
        gap: spacing.xs,
      }}
    >
      {items.length > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            minHeight: 40,
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            onPress={() => setClearDialogOpen(true)}
            testID="cart-clear"
          >
            Очистить
          </Button>
        </View>
      ) : null}
      {cart && cart.warnings.length > 0 ? (
        <Text variant="caption" color="textSecondary">
          {cart.warnings.length === 1 && cart.warnings[0]
            ? cart.warnings[0].message
            : `Позиции требуют внимания: ${cart.warnings.length}`}
        </Text>
      ) : null}
    </View>
  );

  if (cartQuery.isError) {
    return (
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {header}
        <ErrorState
          title="Корзина не загрузилась"
          description="Проверьте соединение и попробуйте снова"
          onRetry={() => void cartQuery.refetch()}
        />
      </ScrollView>
    );
  }

  if (cartQuery.isPending || !cart) {
    return (
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {header}
        <CartSkeleton />
      </ScrollView>
    );
  }

  if (items.length === 0) {
    return (
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {header}
        <EmptyState
          icon={ShoppingCart}
          title="Корзина пуста"
          description="Добавьте товары из каталога — они появятся здесь"
          action={{
            label: 'Перейти в каталог',
            onPress: () => router.push('/' + basePath + '/catalog'),
          }}
        />
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View>
            <CartItemCard
              name={item.offer.product.name}
              unit={item.offer.product.unit}
              sellerName={item.offer.organization.name}
              priceKopecks={item.offer.priceKopecks}
              quantity={item.quantity}
              minQuantity={item.offer.minQuantity}
              stock={item.offer.stock}
              toneIndex={index}
              onQuantityChange={(quantity) => {
                updateItem.mutate(
                  { itemId: item.id, quantity },
                  {
                    onError: () =>
                      show({
                        variant: 'info',
                        message: 'Количество не изменилось: проверьте наличие',
                      }),
                  },
                );
              }}
              onRemove={() => {
                removeItem.mutate(item.id, {
                  onSuccess: () =>
                    show({
                      variant: 'info',
                      message: `${item.offer.product.name} удалён из корзины`,
                    }),
                });
              }}
              testID={`cart-item-${index}`}
            />
            {warningByItem.has(item.id) ? (
              <Text
                variant="caption"
                color="textSecondary"
                style={{ marginTop: spacing.xs, paddingHorizontal: spacing.xs }}
              >
                {warningByItem.get(item.id)}
              </Text>
            ) : null}
          </View>
        )}
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.md,
          paddingBottom: 180,
        }}
        ListHeaderComponent={header}
      />

      {/* Sticky-итог: основное действие — самое заметное. */}
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
            {`Товаров: ${goodsCount} · Позиций: ${items.length}`}
          </Text>
          <Text variant="bodyStrong" mono testID="cart-subtotal">
            {`Итого: ${Math.round(cart.subtotal / 100).toLocaleString('ru-RU')} ₽`}
          </Text>
        </View>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => router.push('/' + basePath + '/cart/checkout')}
          testID="cart-checkout"
        >
          Оформить заказ
        </Button>
      </View>

      <Dialog
        visible={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        title="Очистить корзину?"
        dismissable={false}
      >
        <Text
          variant="body"
          color="textSecondary"
          style={{ marginBottom: spacing.lg }}
        >
          Все позиции будут удалены. Действие нельзя отменить.
        </Text>
        <View style={{ gap: spacing.sm }}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => {
              setClearDialogOpen(false);
              clearCart.mutate(undefined, {
                onSuccess: () =>
                  show({ variant: 'info', message: 'Корзина очищена' }),
              });
            }}
            testID="cart-clear-confirm"
          >
            Очистить
          </Button>
          <Button
            variant="ghost"
            size="lg"
            fullWidth
            onPress={() => setClearDialogOpen(false)}
          >
            Оставить
          </Button>
        </View>
      </Dialog>
    </View>
  );
}
