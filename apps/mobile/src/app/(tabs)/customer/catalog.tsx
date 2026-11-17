/**
 * Каталог (catalog) — первый реальный бизнес-экран роли «покупатель»
 * (Промт 8, Часть C).
 *
 * Данные — публичный API каталога через TanStack Query:
 * - поиск с дебаунсом 400 мс (тег «запрос ×» снимает его);
 * - чипы категорий (все + 6 из API);
 * - сортировка SortPicker, фильтр цены «от/до» в раскрывающейся панели;
 * - бесконечная пагинация (onEndReached, страница 10 позиций);
 * - pull-to-refresh, скелетоны (не спиннеры), осмысленные пустое
 *   состояние и состояние ошибки.
 */
import { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { CatalogCategory, CatalogProduct } from '@bazar/types';
import {
  CategoryChip,
  EmptyCatalogState,
  ErrorState,
  FilterChip,
  PriceRangeInput,
  ProductCard,
  SearchBar,
  Skeleton,
  SortPicker,
  Text,
  useTheme,
  useToast,
  type SortValue,
} from '@bazar/ui';
import {
  Carrot,
  Apple,
  Leaf,
  Milk,
  Package,
  SlidersHorizontal,
  Wheat,
  type LucideIcon,
} from 'lucide-react-native';
import { RoleScreen } from '../../../components/shell/RoleScreen';
import {
  fetchCategories,
  fetchProducts,
} from '../../../services/api/catalogApi';
import { resolveMediaUrl } from '../../../services/api/client';
import {
  useAddToCart,
  useCart,
  useRemoveCartItem,
  useUpdateCartItem,
} from '../../../hooks/useCart';

/** slug категории → иконка Lucide (fallback — Package). */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  vegetables: Carrot,
  fruits: Apple,
  greens: Leaf,
  grains: Wheat,
  dairy: Milk,
  other: Package,
};

const PAGE_SIZE = 10;

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

/** Скелетон сетки на время первой загрузки. */
function CatalogSkeleton() {
  const { spacing } = useTheme();
  return (
    <View style={{ padding: spacing.lg, gap: spacing.md }}>
      <Skeleton height={48} />
      <Skeleton height={40} width="70%" />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Skeleton height={96} />
          <Skeleton height={16} width="80%" />
          <Skeleton height={16} width="50%" />
        </View>
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Skeleton height={96} />
          <Skeleton height={16} width="80%" />
          <Skeleton height={16} width="50%" />
        </View>
      </View>
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
  const [category, setCategory] = useState<string>('all');
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

  const header = (
    <View style={{ padding: spacing.lg, gap: spacing.md }}>
      <SearchBar
        value={searchInput}
        onChangeText={setSearchInput}
        placeholder="Поиск: помидоры, яблоки…"
        onSubmit={() => setQuery(searchInput.trim())}
        testID="catalog-search"
      />

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

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <SortPicker value={sort} onChange={setSort} />
        <FilterChip
          label="Фильтры"
          icon={SlidersHorizontal}
          active={priceMin !== '' || priceMax !== ''}
          onPress={() => setFiltersOpen(!filtersOpen)}
        />
        {query ? (
          <FilterChip label={query} onRemove={() => setSearchInput('')} />
        ) : null}
      </View>

      {filtersOpen ? (
        <PriceRangeInput
          min={priceMin}
          max={priceMax}
          onMinChange={setPriceMin}
          onMaxChange={setPriceMax}
        />
      ) : null}

      {/* Счётчик результатов (VLM-аудит: «нет счётчика результатов»). */}
      {productsQuery.data ? (
        <Text variant="caption" color="textSecondary">
          {`${productsQuery.data.pages[0]?.total ?? products.length} ${pluralTovarov(
            productsQuery.data.pages[0]?.total ?? products.length,
          )}`}
          {productsQuery.hasNextPage ? ' · прокрутите за остальными' : ''}
        </Text>
      ) : null}
    </View>
  );

  if (productsQuery.isError) {
    return (
      <View style={{ flex: 1 }}>
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
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: spacing.lg, gap: spacing.md }}
      data={products}
      keyExtractor={(item: CatalogProduct) => item.id}
      renderItem={({ item, index }) => {
        const offerId = item.bestOffer?.id;
        const inCart = offerId ? cartByOffer.get(offerId) : undefined;
        return (
          <ProductCard
            name={item.name}
            description={item.description}
            unit={item.unit}
            priceKopecks={item.bestOffer?.priceKopecks ?? 0}
            stock={
              item.bestOffer
                ? item.bestOffer.stock > 0
                  ? item.bestOffer.stock < 20
                    ? 'low'
                    : 'in'
                  : 'out'
                : undefined
            }
            organizationName={item.bestOffer?.organization.name}
            isHit={item.bestOffer?.badge === 'hit'}
            isPerishable={item.bestOffer?.isPerishable}
            toneIndex={index}
            imageUrl={item.images[0] ? resolveMediaUrl(item.images[0]) : null}
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
            style={{ flex: 1 }}
          />
        );
      }}
      numColumns={2}
      columnWrapperStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}
      ListHeaderComponent={header}
      ListEmptyComponent={
        list.isPending ? (
          <CatalogSkeleton />
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
  );
}

export default function CatalogScreen() {
  return (
    <RoleScreen role="customer" section="catalog" title="Каталог">
      <CatalogBody />
    </RoleScreen>
  );
}
