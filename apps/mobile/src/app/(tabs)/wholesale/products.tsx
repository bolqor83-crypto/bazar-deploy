/**
 * Товары кабинета продавца (Промт 10, Часть B).
 *
 * Рабочий инструмент: плотные строки (64–72 px), поиск, быстрые
 * действия «Редактировать»/«Архив» видны сразу, кнопка «Товар» —
 * единственный primary. Загрузка — Skeleton, пусто — осмысленный
 * EmptyState с CTA, ошибка — ErrorState.
 */
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Archive, Package } from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FilterChip,
  SearchBar,
  Skeleton,
  Text,
  useTheme,
  useToast,
} from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';
import {
  useArchiveSellerProduct,
  useSellerProducts,
} from '../../../hooks/useSeller';

export default function SellerProductsScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const toast = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const productsQuery = useSellerProducts(showArchived);
  const archiveMutation = useArchiveSellerProduct();

  const products = (productsQuery.data ?? []).filter((product) =>
    query.length === 0
      ? true
      : product.title.toLowerCase().includes(query.toLowerCase()),
  );

  const onArchive = (id: string, title: string) => {
    archiveMutation.mutate(id, {
      onSuccess: () => {
        toast.show({
          variant: 'success',
          message: `«${title}» — в архиве, скрыт из каталога`,
        });
      },
      onError: () => {
        toast.show({ variant: 'error', message: 'Не удалось архивировать. Проверьте связь и попробуйте ещё раз' });
      },
    });
  };

  let content: React.ReactNode;
  if (productsQuery.isLoading) {
    content = (
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Skeleton height={72} />
        <Skeleton height={72} />
        <Skeleton height={72} />
      </View>
    );
  } else if (productsQuery.isError) {
    content = (
      <ErrorState
        onRetry={() => {
          void productsQuery.refetch();
        }}
      />
    );
  } else if (products.length === 0) {
    content = showArchived ? (
      <EmptyState
        icon={Archive}
        title="Архив пуст"
        description="Архивированные товары появятся здесь."
      />
    ) : (
      <EmptyState
        icon={Package}
        title="Товаров пока нет"
        description="Создайте первый товар: название, категория и фотография займут пару минут."
        action={{
          label: 'Создать товар',
          onPress: () => router.push('/wholesale/products/new'),
        }}
        testID="products-empty"
      />
    );
  } else {
    content = (
      <ScrollView
        contentContainerStyle={{
          padding: spacing.md,
          paddingBottom: spacing.xl,
          gap: spacing.sm,
        }}
      >
        {products.map((product) => (
          <Card key={product.id}>
            <Pressable
              testID={`seller-product-${product.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${product.title}, предложений: ${product.offersCount}`}
              onPress={() => router.push(`/wholesale/products/${product.id}`)}
              style={({ pressed }) => ({
                paddingHorizontal: spacing.md,
                paddingTop: spacing.sm,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: spacing.sm,
                  minHeight: 48,
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="body" numberOfLines={1}>
                    {product.title}
                  </Text>
                  <Text variant="caption" color="textSecondary" mono>
                    {[
                      product.category.name,
                      `предложений: ${product.offersCount}`,
                    ].join(' · ')}
                  </Text>
                </View>
                {product.archivedAt ? (
                  <Badge variant="neutral" size="sm">
                    В архиве
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="sm">
                    {product.unit}
                  </Badge>
                )}
              </View>
            </Pressable>
            <View
              style={{
                flexDirection: 'row',
                gap: spacing.sm,
                paddingHorizontal: spacing.md,
                paddingBottom: spacing.sm,
                paddingTop: spacing.xs,
              }}
            >
              <View style={{ flex: 1 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => router.push(`/wholesale/products/${product.id}`)}
                  testID={`seller-product-edit-${product.id}`}
                >
                  Редактировать
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={Boolean(product.archivedAt)}
                  onPress={() => onArchive(product.id, product.title)}
                  testID={`seller-product-archive-${product.id}`}
                >
                  {product.archivedAt ? 'В архиве' : 'Архив'}
                </Button>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
    );
  }

  return (
    <RoleScreen role="wholesale_seller" section="products" title="Товары">
      <View style={{ flex: 1, width: '100%' }}>
        <View
          style={{
            paddingHorizontal: spacing.md,
            paddingTop: spacing.sm,
            paddingBottom: spacing.xs,
            gap: spacing.sm,
          }}
        >
          <SearchBar
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Найти товар"
            testID="seller-products-search"
          />
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              minHeight: 48,
              alignItems: 'center',
            }}
          >
            <FilterChip
              label="Активные"
              active={!showArchived}
              onPress={() => setShowArchived(false)}
              testID="seller-products-segment-active"
            />
            <FilterChip
              label="Архив"
              active={showArchived}
              onPress={() => setShowArchived(true)}
              testID="seller-products-segment-archived"
            />
          </View>
          {!showArchived ? (
            <Button
              onPress={() => router.push('/wholesale/products/new')}
              testID="products-create"
            >
              Новый товар
            </Button>
          ) : null}
        </View>
        {content}
      </View>
    </RoleScreen>
  );
}
