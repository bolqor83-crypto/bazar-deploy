/**
 * Предложения кабинета продавца (Промт 10, Часть B).
 *
 * Сегменты Активные/Архив, поиск, плотные строки OfferRow (фото 48,
 * цена, склад, бейдж). Empty — осмысленный с CTA в товары.
 */
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Layers } from 'lucide-react-native';
import {
  Card,
  EmptyState,
  ErrorState,
  FilterChip,
  OfferRow,
  SearchBar,
  Skeleton,
  Text,
  useTheme,
} from '@bazar/ui';
import type { SellerOffer } from '@bazar/types';
import { RoleScreen } from '../../../components/shell/RoleScreen';
import { useSellerOffers } from '../../../hooks/useSeller';

/** Первое фото товара из JSON-строки images. */
function firstImage(rawImages: string): string | null {
  try {
    const parsed = JSON.parse(rawImages) as unknown;
    if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
      return parsed[0];
    }
  } catch {
    // Битый JSON — нет фото.
  }
  return null;
}

export default function SellerOffersScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const [archived, setArchived] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const offersQuery = useSellerOffers({ archived, search: query });

  const offers = offersQuery.data?.items ?? [];

  let content: React.ReactNode;
  if (offersQuery.isLoading) {
    content = (
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Skeleton height={72} />
        <Skeleton height={72} />
        <Skeleton height={72} />
      </View>
    );
  } else if (offersQuery.isError) {
    content = <ErrorState onRetry={() => void offersQuery.refetch()} />;
  } else if (offers.length === 0) {
    content = archived ? (
      <EmptyState
        icon={Layers}
        title="Архив пуст"
        description="Завершённые и удалённые предложения появятся здесь."
      />
    ) : (
      <EmptyState
        icon={Layers}
        title="Предложений нет"
        description="Предложение — это ваша партия товара: цена, склад и минимальный объём. Создайте товар, затем первое предложение."
        action={{
          label: 'К товарам',
          onPress: () => router.push('/wholesale/products'),
        }}
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
        {offers.map((offer) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            onPress={() => router.push(`/wholesale/offers/${offer.id}`)}
          />
        ))}
        <Text variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
          {`Всего: ${offersQuery.data?.total ?? offers.length}`}
        </Text>
      </ScrollView>
    );
  }

  return (
    <RoleScreen role="wholesale_seller" section="offers" title="Предложения">
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
            placeholder="Найти по товару"
            testID="seller-offers-search"
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
              active={!archived}
              onPress={() => setArchived(false)}
              testID="offers-segment-active"
            />
            <FilterChip
              label="Архив"
              active={archived}
              onPress={() => setArchived(true)}
              testID="offers-segment-archived"
            />
          </View>
        </View>
        {content}
      </View>
    </RoleScreen>
  );
}

function OfferCard({
  offer,
  onPress,
}: {
  offer: SellerOffer;
  onPress: () => void;
}) {
  return (
    <Card>
      <View style={{ paddingHorizontal: 12 }}>
        <OfferRow
          title={offer.product.name}
          unit={offer.product.unit}
          priceKopecks={offer.price}
          stock={offer.stock}
          minQuantity={offer.minQuantity}
          badge={offer.badge}
          imageUrl={firstImage(offer.product.images)}
          archived={Boolean(offer.archivedAt)}
          onPress={onPress}
          testID={`seller-offer-${offer.id}`}
        />
      </View>
    </Card>
  );
}
