/**
 * Движения по позиции (Промт 11b; редизайн Промта 12, Часть A).
 *
 * Сводка остатка — одна панель (80) с тремя цифрами physical /
 * reserved / available (numberL, tabular). Четыре действия — один
 * ряд компактных кнопок 48 (иконка + подпись). Журнал — компактные
 * строки MovementRow (56) с разделителями, не карточки. Движения с
 * refType=order ведут в заказ продавца.
 */
import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowDownToLine,
  ArrowLeftRight,
  PackageX,
  Scale,
  Warehouse,
} from 'lucide-react-native';
import {
  Divider,
  EmptyState,
  ErrorState,
  LocationSelector,
  MovementRow,
  Skeleton,
  Text,
  useTheme,
} from '@bazar/ui';
import type { LucideIcon } from 'lucide-react-native';
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

const ACTIONS: {
  key: MovementKind;
  label: string;
  icon: LucideIcon;
  testID: string;
}[] = [
  {
    key: 'RECEIPT',
    label: 'Приход',
    icon: ArrowDownToLine,
    testID: 'stock-action-receipt',
  },
  {
    key: 'WRITE_OFF',
    label: 'Списание',
    icon: PackageX,
    testID: 'stock-action-writeoff',
  },
  {
    key: 'ADJUSTMENT',
    label: 'Коррекция',
    icon: Scale,
    testID: 'stock-action-adjustment',
  },
  {
    key: 'TRANSFER',
    label: 'Перемещение',
    icon: ArrowLeftRight,
    testID: 'stock-action-transfer',
  },
];

/** Номер заказа из причины движения («Резерв заказа BZ-2026-000006»). */
function orderNumberOf(reason: string): string | null {
  return reason.match(/BZ-\d{4}-\d{6}/)?.[0] ?? null;
}

export default function StockMovementsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  /** Прямой URL: params гидратируются не сразу — пустой id до них. */
  const id = typeof params.id === 'string' ? params.id : '';
  const { colors, spacing } = useTheme();

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
          <Skeleton height={80} />
          <Skeleton height={48} />
          <Skeleton height={56} />
          <Skeleton height={56} />
          <Skeleton height={56} />
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
    <View style={{ paddingBottom: spacing.sm }}>
      <View
        style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}
      >
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
      </View>

      {/* Панель остатка: три цифры (80). */}
      <View
        style={{
          height: 80,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          gap: spacing.md,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.border,
        }}
      >
        <BalanceCell label="Всего" value={balance.physicalQty} unit={unit} />
        <BalanceCell label="Резерв" value={balance.reservedQty} unit={unit} />
        <BalanceCell
          label="Доступно"
          value={balance.availableQty}
          unit={unit}
          emphasize
        />
      </View>

      {/* Четыре действия в один ряд. */}
      <View
        style={{
          flexDirection: 'row',
          gap: spacing.sm,
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
        }}
      >
        {ACTIONS.map((action) => (
          <ActionButton
            key={action.key}
            label={action.label}
            icon={action.icon}
            onPress={() => openAction(action.key)}
            testID={action.testID}
          />
        ))}
      </View>

      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
        <Text variant="bodyStrong">{`Журнал движений (${movementsTotal})`}</Text>
      </View>
    </View>
  );

  let content: React.ReactNode;
  if (movementsQuery.isLoading) {
    content = (
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Skeleton height={56} />
        <Skeleton height={56} />
        <Skeleton height={56} />
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
          paddingBottom: spacing.xl,
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
        ItemSeparatorComponent={() => (
          <View style={{ paddingHorizontal: spacing.md }}>
            <Divider />
          </View>
        )}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.md }}>
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
        )}
        ListEmptyComponent={
          <EmptyState
            icon={Warehouse}
            title="Пока нет движений"
            compact
            description="Добавьте приход кнопкой выше — журнал заполнится автоматически."
          />
        }
        ListFooterComponent={
          movementsQuery.isFetchingNextPage ? (
            <Skeleton height={56} />
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

/** Ячейка остатка в панели (emphasize — «Доступно»). */
function BalanceCell({
  label,
  value,
  unit,
  emphasize = false,
}: {
  label: string;
  value: number;
  unit: string;
  emphasize?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <Text
        variant="numberL"
        numberOfLines={1}
        style={{
          color: emphasize ? colors.primaryText : colors.text,
        }}
      >
        {`${value}${unit ? ` ${unit}` : ''}`}
      </Text>
    </View>
  );
}

/** Компактная кнопка действия: иконка сверху, подпись micro снизу. */
function ActionButton({
  label,
  icon: Icon,
  onPress,
  testID,
}: {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  testID?: string;
}) {
  const { colors, radii } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        {
          flex: 1,
          height: 48,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Icon size={18} color={colors.primary} />
      <Text variant="micro" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
