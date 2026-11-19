/**
 * Каталог (catalog) — первый реальный бизнес-экран роли «покупатель»
 * (Промт 8, Часть C).
 *
 * Данные — публичный API каталога через TanStack Query:
 * - поиск с дебаунсом 400 мс (тег «запрос ×» снимает его);
 * - чипы категорий (все + 6 из API) с цветными SVG-иконками;
 * - сортировка SortPicker compact и фильтры — в заголовке секции
 *   «Все товары (N)» одной строкой (Промт 15, Часть D);
 * - адаптивная сетка: 2 колонки < 600, 3 колонки ≥ 600 (планшет,
 *   широкий web) с key={numColumns} для пересоздания при повороте;
 * - бесконечная пагинация (onEndReached, страница 10 позиций);
 * - pull-to-refresh, скелетоны (не спиннеры), осмысленные пустое
 *   состояние и состояние ошибки.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { CatalogCategory, CatalogProduct } from '@bazar/types';
import {
  CategoryChip,
  EmptyCatalogState,
  ErrorState,
  FilterChip,
  IconButton,
  IconApple,
  IconBox,
  IconCarrot,
  IconGrain,
  IconGreens,
  IconMilk,
  PriceRangeInput,
  ProductCard,
  SearchBar,
  Skeleton,
  SortPicker,
  Text,
  useTheme,
  useToast,
  type ColoredIcon,
  type SortValue,
} from '@bazar/ui';
import { SlidersHorizontal } from 'lucide-react-native';
import { RoleScreen } from '../../../components/shell/RoleScreen';
import {
  fetchCategories,
  fetchProducts,
} from '../../../services/api/catalogApi';
import { resolveMediaUrl } from '../../../services/api/client';
import { resolveSilhouette } from '../../../utils/silhouette';
import {
  useAddToCart,
  useCart,
  useRemoveCartItem,
  useUpdateCartItem,
} from '../../../hooks/useCart';

/** slug категории → цветная SVG-иконка (Промт 15: продукт = цвет;
 *  fallback — коробка). */
const CATEGORY_ICONS: Record<string, ColoredIcon> = {
  vegetables: IconCarrot,
  fruits: IconApple,
  greens: IconGreens,
  grains: IconGrain,
  dairy: IconMilk,
  other: IconBox,
};

const PAGE_SIZE = 10;

/** Брейкпоинт планшета/широкого web (Промт 15, Часть D). */
const TABLET_BREAKPOINT = 600;

/** Русская плюрализация для счётчика результатов. */
function pluralTovarov(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'товар';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return 'товара';
  }
  return 'товаров';
}

/** Скелетон сетки на время первой загрузки (Промт 15: повторяет
 *  раскладку — 2×2 на мобиле, 3×2 от брейкпоинта 600). */
function CatalogSkeleton({ numColumns }: { numColumns: number }) {
  const { spacing, radii } = useTheme();
  const skeletonCard = (key: string) => (
    <View key={key} style={{ flex: 1, gap: spacing.sm }}>
      <Skeleton style={{ aspectRatio: 1 }} radius={radii.md} />
      <Skeleton height={18} width="85%" />
      <Skeleton height={16} width="50%" />
    </View>
  );
  return (
    <View style={{ gap: spacing.md }}>
      {[0, 1].map((row) => (
        <View
          key={row}
          style={{
            flexDirection: 'row',
            gap: numColumns >= 3 ? spacing.md : spacing.sm,
          }}
        >
          {Array.from({ length: numColumns }, (_, i) =>
            skeletonCard(`s-${row}-${i}`),
          )}
        </View>
      ))}
    </View>
  );
}

function CatalogBody() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const toast = useToast();
  const addToCartMutation = useAddToCart();
  const updateItemMutation = useUpdateCartItem();
  const removeItemMutation = useRemoveCartItem();

  // Промт 15 (Часть D): адаптивная сетка — 2 колонки на мобиле,
  // 3 от 600px (планшет, широкий web). key={numColumns} ниже
  //  пересоздаёт FlatList при смене раскладки (без warnings).
  const { width: windowWidth } = useWindowDimensions();
  const numColumns = windowWidth >= TABLET_BREAKPOINT ? 3 : 2;
  // Литералы из ТЗ Промта 15 (§6.1): в шкале 14b нет шага 12,
  // а ширина карточки 173 на 390 считается ровно от этих чисел:
  // (390 − 2×16 − 12) / 2 = 173.
  const gridGap = windowWidth >= TABLET_BREAKPOINT ? 16 : 12;
  const gridPadding = 16;

  // Промт 14a: «Все →» из карусели похожих ведёт в каталог с той же
  // категорией — читаем стартовый фильтр из query-параметра.
  const params = useLocalSearchParams<{ category?: string }>();
  const initialCategory =
    typeof params.category === 'string' && params.category.length > 0
      ? params.category
      : 'all';

  // Корзина контура: карта offerId → {itemId, quantity} — карточка
  // показывает состояние «уже в корзине» мини-степпером (VLM-аудит
  // итерации 3: карточка без состояния корзины читалась как пассивная).
  const cartQuery = useCart();
  const cartByOffer = useMemo(() => {
    const map = new Map<string, { itemId: string; quantity: number }>();
    for (const item of cartQuery.data?.items ?? []) {
      map.set(item.offer.id, { itemId: item.id, quantity: item.quantity });
    }
    return map;
  }, [cartQuery.data]);

  // Ввод поиска применяется с дебаунсом; onSubmit — сразу.
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>(initialCategory);
  const [sort, setSort] = useState<SortValue>('popular');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  // Дебаунс поиска: 400 мс тишины — и строка уходит в запрос.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const hasFilters =
    category !== 'all' || query !== '' || priceMin !== '' || priceMax !== '';

  const categoriesQuery = useQuery({
    queryKey: ['catalog', 'categories'],
    queryFn: fetchCategories,
  });

  const productsQuery = useInfiniteQuery({
    queryKey: [
      'catalog',
      'products',
      { category, query, sort, priceMin, priceMax },
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchProducts({
        category: category === 'all' ? undefined : category,
        q: query || undefined,
        sort,
        page: pageParam,
        pageSize: PAGE_SIZE,
        minPrice: priceMin ? Number(priceMin) : undefined,
        maxPrice: priceMax ? Number(priceMax) : undefined,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
  });

  const products = useMemo(
    () => productsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [productsQuery.data],
  );

  const refreshing =
    productsQuery.isRefetching && !productsQuery.isFetchingNextPage;

  const onRefresh = () => {
    void productsQuery.refetch();
    void categoriesQuery.refetch();
  };

  const resetFilters = () => {
    setCategory('all');
    setSearchInput('');
    setQuery('');
    setPriceMin('');
    setPriceMax('');
  };

  const openProduct = (id: string) => {
    router.push(`/customer/product/${id}`);
  };

  /** +1 партия из карточки. */
  const increment = (entry: { itemId: string; quantity: number }) => {
    updateItemMutation.mutate({
      itemId: entry.itemId,
      quantity: entry.quantity + 1,
    });
  };

  /** −1 партия; последняя — позиция убирается. */
  const decrement = (entry: { itemId: string; quantity: number }) => {
    if (entry.quantity > 1) {
      updateItemMutation.mutate({
        itemId: entry.itemId,
        quantity: entry.quantity - 1,
      });
    } else {
      removeItemMutation.mutate(entry.itemId);
    }
  };

  /** Быстрое добавление из карточки — минимальной партией
   *  лучшего предложения (Промт 12: VLM-аудит — «карточка пассивна»). */
  const quickAdd = (item: CatalogProduct) => {
    const offer = item.bestOffer;
    if (!offer || offer.stock <= 0) {
      return;
    }
    addToCartMutation.mutate(
      { offerId: offer.id, quantity: offer.minQuantity },
      {
        onSuccess: () => {
          toast.show({
            variant: 'success',
            message: `${item.name} — в корзине (${offer.minQuantity} ${item.unit})`,
          });
        },
        onError: () => {
          toast.show({
            variant: 'info',
            message: 'Не удалось добавить: проверьте наличие и партию',
          });
        },
      },
    );
  };

  /* Промт 14b: поиск закреплён под шапкой — не уезжает вместе
   * со списком, до него не тянуться при длинной прокрутке. */
  const searchBlock = (
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
      <SearchBar
        value={searchInput}
        onChangeText={setSearchInput}
        placeholder="Поиск: помидоры, яблоки…"
        onSubmit={() => setQuery(searchInput.trim())}
        testID="catalog-search"
      />
    </View>
  );

  const header = (
    <View
      style={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm,
        gap: spacing.sm,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm }}
      >
        <CategoryChip
          label="Все"
          active={category === 'all'}
          onPress={() => setCategory('all')}
          testID="chip-all"
        />
        {(categoriesQuery.data ?? []).map((cat: CatalogCategory) => {
          const Icon = CATEGORY_ICONS[cat.slug];
          return (
            <CategoryChip
              key={cat.slug}
              label={cat.name}
              icon={Icon ?? null}
              active={category === cat.slug}
              onPress={() => setCategory(cat.slug)}
              testID={`chip-${cat.slug}`}
            />
          );
        })}
      </ScrollView>

      {/* Активный поисковый запрос — отдельной строкой: заголовок
          секции занят сортировкой и фильтрами (Промт 15, D). */}
      {query ? (
        <FilterChip label={query} onRemove={() => setSearchInput('')} />
      ) : null}

      {filtersOpen ? (
        <PriceRangeInput
          min={priceMin}
          max={priceMax}
          onMinChange={setPriceMin}
          onMaxChange={setPriceMax}
        />
      ) : null}

      {/* Заголовок секции — одна строка 40px (Промт 15, D):
          «Все товары (N)» слева, compact-сортировка и кнопка
          фильтров справа. Было 3 строки (120px) — стало 1. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
        }}
      >
        <Text variant="h2" numberOfLines={1} style={{ flexShrink: 1 }}>
          Все товары
        </Text>
        {productsQuery.data ? (
          <Text
            variant="caption"
            color="textSecondary"
            style={{ flexShrink: 0 }}
            accessibilityLabel={`${pluralTovarov(
              productsQuery.data.pages[0]?.total ?? products.length,
            )}: ${productsQuery.data.pages[0]?.total ?? products.length}`}
          >
            {`(${productsQuery.data.pages[0]?.total ?? products.length})`}
          </Text>
        ) : null}
        <View style={{ flex: 1 }} />
        <SortPicker compact value={sort} onChange={setSort} />
        <IconButton
          icon={SlidersHorizontal}
          variant={filtersOpen ? 'default' : 'ghost'}
          accessibilityLabel="Фильтры"
          onPress={() => setFiltersOpen(!filtersOpen)}
          testID="catalog-filters"
        />
      </View>
    </View>
  );

  if (productsQuery.isError) {
    return (
      <View style={{ flex: 1 }}>
        {searchBlock}
        {header}
        <ErrorState
          title="Каталог не загрузился"
          description="Проверьте соединение и попробуйте снова"
          onRetry={() => void productsQuery.refetch()}
        />
      </View>
    );
  }

  const list = productsQuery;

  return (
    <View style={{ flex: 1 }}>
      {searchBlock}
      <FlatList
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: spacing.lg }}
        data={products}
        // Пересоздание списка при смене числа колонок (поворот,
        // resize окна на web) — иначе stale-раскладка и warnings.
        key={numColumns}
        keyExtractor={(item: CatalogProduct) => item.id}
        renderItem={({ item, index }) => {
          const offerId = item.bestOffer?.id;
          const inCart = offerId ? cartByOffer.get(offerId) : undefined;
          return (
            <ProductCard
              name={item.name}
              unit={item.unit}
              priceKopecks={item.bestOffer?.priceKopecks ?? null}
              priceOnRequest={item.bestOffer?.priceOnRequest ?? false}
              stock={
                item.bestOffer
                  ? item.bestOffer.stock > 0
                    ? item.bestOffer.stock < 20
                      ? 'low'
                      : 'in'
                    : 'out'
                  : undefined
              }
              isHit={item.bestOffer?.badge === 'hit'}
              isPerishable={item.bestOffer?.isPerishable}
              toneIndex={index}
              imageUrl={item.images[0] ? resolveMediaUrl(item.images[0]) : null}
              silhouette={resolveSilhouette(item.name)}
              quantityInCart={inCart?.quantity}
              onIncrement={inCart ? () => increment(inCart) : undefined}
              onDecrement={inCart ? () => decrement(inCart) : undefined}
              testID="catalog-product"
              onPress={() => openProduct(item.id)}
              onAddToCart={
                item.bestOffer && item.bestOffer.stock > 0
                  ? () => quickAdd(item)
                  : undefined
              }
              style={{ flex: 1 / numColumns }}
            />
          );
        }}
        numColumns={numColumns}
        columnWrapperStyle={{ gap: gridGap, paddingHorizontal: gridPadding }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          list.isPending ? (
            <CatalogSkeleton numColumns={numColumns} />
          ) : (
            <EmptyCatalogState hasFilters={hasFilters} onReset={resetFilters} />
          )
        }
        ListFooterComponent={
          list.isFetchingNextPage ? (
            <View
              style={{
                padding: spacing.lg,
                flexDirection: 'row',
                gap: spacing.md,
              }}
            >
              <Skeleton height={16} width="40%" />
              <Skeleton height={16} width="30%" />
            </View>
          ) : undefined
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.textSecondary}
          />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) {
            void list.fetchNextPage();
          }
        }}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

export default function CatalogScreen() {
  return (
    <RoleScreen role="customer" section="catalog" title="Каталог">
      <CatalogBody />
    </RoleScreen>
  );
}
