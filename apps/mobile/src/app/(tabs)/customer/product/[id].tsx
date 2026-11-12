/**
 * Карточка товара: /customer/product/[id] (Промт 8, Часть C).
 *
 * Свой экран (без таб-бара): круглая кнопка «назад» и «избранное»,
 * галерея, ProductDetailCard с ценой и предложениями продавцов.
 * Нижняя панель: количество (минимум — минимальная партия лучшего
 * предложения) и кнопка «В корзину · сумма» — корзина появится в
 * Промте 9, сейчас показываем тост.
 */
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  ErrorState,
  ProductDetailCard,
  ProductGallery,
  QuantitySelector,
  Skeleton,
  useToast,
  useTheme,
} from '@bazar/ui';
import { ChevronLeft, Heart } from 'lucide-react-native';
import { fetchProduct } from '../../../../services/api/catalogApi';

/** Скелетон экрана товара. */
function ProductSkeleton() {
  const { spacing } = useTheme();
  return (
    <View style={{ padding: spacing.lg, gap: spacing.md }}>
      <Skeleton height={220} />
      <Skeleton height={24} width="70%" />
      <Skeleton height={16} width="90%" />
      <Skeleton height={16} width="40%" />
      <Skeleton height={72} />
    </View>
  );
}

function ProductBody({ id }: { id: string }) {
  const { width } = useWindowDimensions();
  const { spacing, colors } = useTheme();

  const productQuery = useQuery({
    queryKey: ['catalog', 'product', id],
    queryFn: () => fetchProduct(id),
  });

  const product = productQuery.data;
  const best = useMemo(() => product?.offers[0] ?? null, [product]);

  const [quantity, setQuantity] = useState<number | null>(null);
  const { show } = useToast();

  if (productQuery.isError) {
    return (
      <ErrorState
        title="Товар не загрузился"
        description="Проверьте соединение и попробуйте снова"
        onRetry={() => void productQuery.refetch()}
      />
    );
  }

  if (productQuery.isPending || !product) {
    return <ProductSkeleton />;
  }

  const minQuantity =
    best?.minQuantity && best.minQuantity > 1 ? best.minQuantity : 1;
  const effectiveQuantity = quantity ?? minQuantity;
  const totalKopecks = best ? best.priceKopecks * effectiveQuantity : 0;
  const totalRubles = Math.round(totalKopecks / 100);

  const addToCart = () => {
    show({
      variant: 'info',
      message: 'Корзина появится в следующем обновлении',
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.lg,
          paddingBottom: 140,
        }}
      >
        <ProductGallery
          images={product.images}
          slideWidth={Math.floor(width - spacing.lg * 2)}
        />

        <ProductDetailCard
          name={product.name}
          description={product.description}
          unit={product.unit}
          priceKopecks={best?.priceKopecks ?? 0}
          stock={
            best
              ? best.stock > 0
                ? best.stock < 20
                  ? 'low'
                  : 'in'
                : 'out'
              : 'out'
          }
          minQuantity={best?.minQuantity}
          isHit={best?.badge === 'hit'}
          isPerishable={best?.isPerishable}
          sellerName={best?.organization.name ?? '—'}
          offers={product.offers.map((offer) => ({
            id: offer.id,
            organizationName: offer.organization.name,
            priceKopecks: offer.priceKopecks,
            stock: offer.stock,
            minQuantity: offer.minQuantity,
          }))}
          testID="product-card"
        />
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.lg,
          paddingBottom: spacing.xl,
          backgroundColor: colors.backgroundElevated,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <QuantitySelector
          value={effectiveQuantity}
          onChange={setQuantity}
          min={minQuantity}
          max={Math.min(best?.stock ?? 99, 99)}
        />
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={addToCart}
          disabled={!best}
          testID="add-to-cart"
        >
          {best
            ? `В корзину · ${totalRubles.toLocaleString('ru-RU')} ₽`
            : 'Нет предложений'}
        </Button>
      </View>
    </View>
  );
}

export default function ProductScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const params = useLocalSearchParams<{ id: string }>();

  const id = typeof params.id === 'string' ? params.id : '';

  const circleButton = (
    onPress: () => void,
    label: string,
    Icon: typeof ChevronLeft,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
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
      <Icon size={22} color={colors.text} />
    </Pressable>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top']}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          minHeight: 56,
        }}
      >
        {circleButton(() => router.back(), 'Назад', ChevronLeft)}
        {circleButton(() => undefined, 'В избранное', Heart)}
      </View>
      {id ? (
        <ProductBody id={id} />
      ) : (
        <ErrorState
          title="Товар не найден"
          description="Ссылка недействительна"
        />
      )}
    </SafeAreaView>
  );
}
