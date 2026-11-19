/**
 * Карточка товара: /customer/product/[id] (Промт 8, Часть C).
 *
 * Свой экран (без таб-бара): круглая кнопка «назад» и «избранное»,
 * галерея, ProductDetailCard с ценой и предложениями продавцов,
 * карусель похожих товаров (Промт 14a).
 * Нижняя панель: количество (минимум — минимальная партия лучшего
 * предложения) и кнопка «В корзину · сумма».
 *
 * Промт 16 (C): если лучшее предложение «по запросу» — кнопка
 * «Запросить цену» и шит PriceRequestDialog (количество +
 * сообщение); после ответа продавца покупатель добавляет в
 * корзину по персональной цене из экрана «Запросы».
 */
import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAddToCart } from '../../../../hooks/useCart';
import { useCreatePriceRequest } from '../../../../hooks/usePriceRequests';
import { useSimilarProducts } from '../../../../hooks/useSimilarProducts';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  ErrorState,
  HorizontalProductCarousel,
  PriceRequestDialog,
  ProductDetailCard,
  ProductGallery,
  QuantitySelector,
  Skeleton,
  useToast,
  useTheme,
} from '@bazar/ui';
import { ChevronLeft, Heart } from 'lucide-react-native';
import { fetchProduct } from '../../../../services/api/catalogApi';
import { resolveMediaUrl } from '../../../../services/api/client';
import { resolveSilhouette } from '../../../../utils/silhouette';
import type { CarouselItem } from '@bazar/ui';

/** Скелетон экрана товара: галерея — квадрат 1:1 (Промт 14b). */
function ProductSkeleton() {
  const { spacing } = useTheme();
  const { width } = useWindowDimensions();
  return (
    <View style={{ padding: spacing.lg, gap: spacing.md }}>
      <Skeleton height={Math.floor(width - spacing.lg * 2)} radius={20} />
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
  const router = useRouter();
  // Промт 14a: при переходе на похожий товар страница скроллится
  // наверх — пользователь не должен оказаться в середине нового экрана.
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  const productQuery = useQuery({
    queryKey: ['catalog', 'product', id],
    queryFn: () => fetchProduct(id),
  });

  const similarQuery = useSimilarProducts(id);

  const product = productQuery.data;
  const best = useMemo(() => product?.offers[0] ?? null, [product]);

  // Карусель похожих: только товары с ОТКРЫТОЙ ценой (bestOffer
  // с priceKopecks !== null — Промт 16, C: компактной карточке
  // карусели нечего показать без цифры), фото — первое из списка,
  // бейдж — один («Хит» или «Скоропорт»).
  const similarItems = useMemo<CarouselItem[]>(() => {
    const items = similarQuery.data?.items ?? [];
    return items
      .filter(
        (item) =>
          item.bestOffer !== null && item.bestOffer.priceKopecks !== null,
      )
      .map((item) => ({
        id: item.id,
        title: item.name,
        subtitle: item.category.name,
        image: item.images[0] ? resolveMediaUrl(item.images[0]) : undefined,
        silhouette: resolveSilhouette(item.name),
        price: item.bestOffer?.priceKopecks ?? 0,
        unit: item.unit,
        badge:
          item.bestOffer?.badge === 'hit'
            ? 'Хит'
            : item.bestOffer?.isPerishable
              ? 'Скоропорт'
              : undefined,
      }));
  }, [similarQuery.data]);

  const [quantity, setQuantity] = useState<number | null>(null);
  const [requestDialogVisible, setRequestDialogVisible] = useState(false);
  const { show } = useToast();
  const addToCartMutation = useAddToCart();
  const createRequestMutation = useCreatePriceRequest();

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
  // Промт 16 (C): лучшее предложение «по запросу» — цены нет,
  // покупатель запрашивает персональную.
  const bestIsPor = best !== null && best.priceKopecks === null;
  const totalKopecks =
    best && best.priceKopecks !== null
      ? best.priceKopecks * effectiveQuantity
      : 0;
  const totalRubles = Math.round(totalKopecks / 100);

  const submitPriceRequest = ({
    quantity: requestQuantity,
    message,
  }: {
    quantity: number;
    message: string;
  }) => {
    if (!best) {
      return;
    }
    createRequestMutation.mutate(
      {
        offerId: best.id,
        quantity: requestQuantity,
        message: message || undefined,
      },
      {
        onSuccess: () => {
          setRequestDialogVisible(false);
          show({
            variant: 'success',
            message: 'Запрос отправлен — ответ придёт в уведомлениях',
          });
        },
        onError: () => {
          show({
            variant: 'info',
            message: 'Не удалось отправить запрос — попробуйте ещё раз',
          });
        },
      },
    );
  };

  const addToCart = () => {
    if (!best) {
      return;
    }
    addToCartMutation.mutate(
      { offerId: best.id, quantity: effectiveQuantity },
      {
        onSuccess: () => {
          show({
            variant: 'success',
            message: `${product.name} — в корзине (${effectiveQuantity} ${product.unit})`,
          });
        },
        onError: () => {
          show({
            variant: 'info',
            message: 'Не удалось добавить: проверьте наличие и партию',
          });
        },
      },
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.lg,
          paddingBottom: 140,
        }}
      >
        {/* Промт 14b: галерея 1:1 — высота равна ширине кадра
            (ширина экрана минус боковые отступы 20+20). */}
        <ProductGallery
          images={product.images.map(resolveMediaUrl)}
          silhouette={resolveSilhouette(product.name)}
          slideWidth={Math.floor(width - spacing.lg * 2)}
          height={Math.floor(width - spacing.lg * 2)}
        />

        <ProductDetailCard
          name={product.name}
          description={product.description}
          unit={product.unit}
          priceKopecks={best ? best.priceKopecks : null}
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

        {/* Промт 14a: карусель похожих товаров — вспомогательная
            секция после карточки, до sticky-CTA. Карусель — на всю
            ширину экрана (marginHorizontal компенсирует padding
            экрана); отступ от карточки — spacing.xl: gap контейнера
            (lg) + добивка (xl − lg) — формула переживает смену
            шкалы spacing в 14b. */}
        <View
          style={{
            marginHorizontal: -spacing.lg,
            marginTop: spacing.xl - spacing.lg,
          }}
        >
          <HorizontalProductCarousel
            title="Похожие товары"
            items={similarItems}
            loading={similarQuery.isPending}
            onItemPress={(similarId) => {
              scrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
              router.push(`/customer/product/${similarId}`);
            }}
            onSeeAllPress={() => {
              router.push(
                `/customer/catalog?category=${product.category.slug}`,
              );
            }}
          />
        </View>
      </ScrollView>

      {/* Промт 14b: sticky-CTA — padding lg сверху и снизу; кнопка
          primary size lg уже 56 (thumb zone для перчаток).
          Промт 16 (C): POR-предложение — «Запросить цену» (шит),
          обычное — «В корзину · сумма». */}
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
          backgroundColor: colors.backgroundElevated,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        {bestIsPor ? (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => setRequestDialogVisible(true)}
            testID="request-price"
          >
            Запросить цену
          </Button>
        ) : (
          <>
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
          </>
        )}
      </View>

      {/* Промт 16 (C): шит запроса цены для POR-предложения. */}
      <PriceRequestDialog
        visible={requestDialogVisible}
        onClose={() => setRequestDialogVisible(false)}
        productName={product.name}
        minQuantity={minQuantity}
        stock={best?.stock ?? 99}
        initialQuantity={effectiveQuantity}
        onSubmit={submitPriceRequest}
        submitting={createRequestMutation.isPending}
      />
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
