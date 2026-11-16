/**
 * Движения по позиции (Промт 11b).
 *
 * Карточка остатка (physical / reserved / available крупно),
 * переключение склада, четыре действия (приход, списание,
 * корректировка, перемещение) и журнал MovementRow с бесконечной
 * прокруткой. Движения с refType=order ведут в заказ продавца.
 */
import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Warehouse } from 'lucide-react-native';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LocationSelector,
  MovementRow,
  Skeleton,
  Text,
  useTheme,
} from '@bazar/ui';
import type { MovementType } from '@bazar/ui';
import { RoleScreen } from '../../../../components/shell/RoleScreen';
import { useSellerOffer } from '../../../../hooks/useSeller';
import {
  useStockBalances,
  useStockLocations,
  useStockMovements,
  useStockSummary,
} from '../../../../hooks/useStock';

type MovementKind = 'RECEIPT' | 'WRITE_OFF' | 'ADJUSTMENT' | 'TRANSFER';

/** Номер заказа из причины движения («Резерв заказа BZ-2026-000006»). */
function orderNumberOf(reason: string): string | null {
  return reason.match(/BZ-\d{4}-\d{6}/)?.[0] ?? null;
}

export default function StockMovementsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  /** Прямой URL: params гидратируются не сразу — пустой id до них. */
  const id = typeof params.id === 'string' ? params.id : '';
  const { spacing } = useTheme();

  const [locationId, setLocationId] = useState<string | null>(null);

  const offerQuery = useSellerOffer(id);
  const summaryQuery = useStockSummary(id);
  const balancesQuery = useStockBalances({ offerId: id });
  const locationsQuery = useStockLocations();
  const movementsQuery = useStockMovements({ offerId: id, locationId });

  const offer = offerQuery.data;
  const summary = summaryQuery.data;
  const unit = offer?.product.unit ?? '';
  const locations = locationsQuery.data ?? [];

  const movements = useMemo(
    () => movementsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [movementsQuery.data],
  );
  const movementsTotal = movementsQuery.data?.pages[0]?.total ?? 0;

  if (offerQuery.isLoading) {
    return (
      <RoleScreen role="wholesale_seller" section="stock" title="Склад">
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <Skeleton height={96} />
          <Skeleton height={48} />
          <Skeleton height={64} />
          <Skeleton height={64} />
          <Skeleton height={64} />
        </View>
      </RoleScreen>
    );
  }

  if (offerQuery.isError || !offer) {
    return (
      <RoleScreen role="wholesale_seller" section="stock" title="Склад">
        <ErrorState
          title="Позиция не найдена"
          description="Возможно, предложение удалено или принадлежит другой организации."
          onRetry={() => router.replace('/wholesale/stock')}
        />
      </RoleScreen>
    );
  }

  /** Остаток выбранного склада (null — сводный по всем). */
  const selectedBalance =
    locationId === null
      ? null
      : (balancesQuery.data?.items.find((b) => b.locationId === locationId) ??
        null);

  const balance = selectedBalance ?? {
    physicalQty: summary?.physicalQty ?? 0,
    reservedQty: summary?.reservedQty ?? 0,
    availableQty: summary?.availableQty ?? 0,
  };
  /** Складов с остатком (для подписи «Все склады»). */
  const locationsCount = selectedBalance ? 1 : (summary?.locationsCount ?? 0);

  const openAction = (kind: MovementKind) => {
    if (kind === 'TRANSFER') {
      router.push(`/wholesale/stock/${id}/transfer`);
    } else {
      router.push(`/wholesale/stock/${id}/movement?type=${kind}`);
    }
  };

  const header = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.sm }}>
      <Card style={{ padding: spacing.md, gap: spacing.sm }}>
        <LocationSelector
          locations={locations.map((l) => ({
            id: l.id,
            name: l.name,
            address: l.address ?? undefined,
          }))}
          value={locationId}
          onChange={setLocationId}
          label="Склад"
          allLabel="Все склады"
          allCaption={`Складов с остатком: ${locationsCount}`}
          disabled={locationsQuery.isLoading}
        />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <BalanceCell
            label="Всего"
            value={balance.physicalQty}
            unit={unit}
            strong
          />
          <BalanceCell label="Резерв" value={balance.reservedQty} unit={unit} />
          <BalanceCell
            label="Доступно"
            value={balance.availableQty}
            unit={unit}
          />
        </View>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <View style={{ flexGrow: 1, flexBasis: '47%' }}>
          <Button
            variant="primary"
            onPress={() => openAction('RECEIPT')}
            testID="stock-action-receipt"
            fullWidth
          >
            Приход
          </Button>
        </View>
        <View style={{ flexGrow: 1, flexBasis: '47%' }}>
          <Button
            variant="secondary"
            onPress={() => openAction('WRITE_OFF')}
            testID="stock-action-writeoff"
            fullWidth
          >
            Списание
          </Button>
        </View>
        <View style={{ flexGrow: 1, flexBasis: '47%' }}>
          <Button
            variant="secondary"
            onPress={() => openAction('ADJUSTMENT')}
            testID="stock-action-adjustment"
            fullWidth
          >
            Корректировка
          </Button>
        </View>
        <View style={{ flexGrow: 1, flexBasis: '47%' }}>
          <Button
            variant="secondary"
            onPress={() => openAction('TRANSFER')}
            testID="stock-action-transfer"
            fullWidth
          >
            Перемещение
          </Button>
        </View>
      </View>

      <Text variant="bodyStrong">{`Журнал движений (${movementsTotal})`}</Text>
    </View>
  );

  let content: React.ReactNode;
  if (movementsQuery.isLoading) {
    content = (
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Skeleton height={64} />
        <Skeleton height={64} />
        <Skeleton height={64} />
      </View>
    );
  } else if (movementsQuery.isError) {
    content = <ErrorState onRetry={() => void movementsQuery.refetch()} />;
  } else {
    content = (
      <FlatList
        data={movements}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.xl,
          gap: spacing.sm,
        }}
        onEndReached={() => {
          if (
            movementsQuery.hasNextPage &&
            !movementsQuery.isFetchingNextPage
          ) {
            void movementsQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <Card>
            <View style={{ paddingHorizontal: 12 }}>
              <MovementRow
                type={item.type as MovementType}
                quantityDelta={item.quantityDelta}
                reason={item.reason}
                locationName={item.locationName}
                createdAt={item.createdAt}
                linkLabel={
                  item.refType === 'order'
                    ? (orderNumberOf(item.reason) ?? 'Заказ')
                    : null
                }
                onPress={
                  item.refType === 'order' && item.refId
                    ? () => router.push(`/wholesale/orders/${item.refId}`)
                    : undefined
                }
                testID={`movement-${item.id}`}
              />
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={Warehouse}
            title="Пока нет движений"
            description="Добавьте приход через форму сверху — журнал заполнится автоматически."
          />
        }
        ListFooterComponent={
          movementsQuery.isFetchingNextPage ? (
            <Skeleton height={64} />
          ) : movementsQuery.hasNextPage ? (
            <Text
              variant="caption"
              color="textSecondary"
              style={{ textAlign: 'center', paddingVertical: spacing.sm }}
            >
              Прокрутите вниз — подгружаем ещё
            </Text>
          ) : undefined
        }
      />
    );
  }

  return (
    <RoleScreen
      role="wholesale_seller"
      section="stock"
      title={offer.product.name}
    >
      <View style={{ flex: 1, width: '100%' }}>{content}</View>
    </RoleScreen>
  );
}

/** Ячейка остатка в карточке. */
function BalanceCell({
  label,
  value,
  unit,
  strong = false,
}: {
  label: string;
  value: number;
  unit: string;
  strong?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <Text
        variant={strong ? 'h3' : 'bodyStrong'}
        mono
        style={{ color: colors.text }}
      >
        {`${value}${unit ? ` ${unit}` : ''}`}
      </Text>
    </View>
  );
}
