/**
 * Склад — обзор остатков (Промт 11b).
 *
 * Рабочий инструмент продавца: выбор склада (или «Все склады»),
 * три карточки сводки (позиции / единицы / мало), поиск по товару,
 * сегмент «Все · Мало · Нет в наличии» и плотные строки StockRow.
 * FAB «+» — двухшаговый шит: действие → позиция → форма.
 */
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowDownToLine,
  ArrowLeftRight,
  PackageX,
  Plus,
  Scale,
  Warehouse,
} from 'lucide-react-native';
import {
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  FilterChip,
  LocationSelector,
  SearchBar,
  Skeleton,
  StockRow,
  Text,
  useTheme,
  stockLevelOf,
} from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';
import { useStockLocations, useStockOverview } from '../../../hooks/useStock';

type StockFilter = 'all' | 'low' | 'out';

/** Действие FAB-шита. */
const FAB_ACTIONS: {
  key: MovementKind;
  label: string;
  icon: typeof Plus;
  hint: string;
}[] = [
  {
    key: 'RECEIPT',
    label: 'Приход',
    icon: ArrowDownToLine,
    hint: 'Принять товар на склад',
  },
  {
    key: 'WRITE_OFF',
    label: 'Списание',
    icon: PackageX,
    hint: 'Порча, потеря, брак',
  },
  {
    key: 'ADJUSTMENT',
    label: 'Корректировка',
    icon: Scale,
    hint: 'Сверка остатка с фактом',
  },
  {
    key: 'TRANSFER',
    label: 'Перемещение',
    icon: ArrowLeftRight,
    hint: 'Между складами организации',
  },
];

type MovementKind = 'RECEIPT' | 'WRITE_OFF' | 'ADJUSTMENT' | 'TRANSFER';

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

export default function StockOverviewScreen() {
  const router = useRouter();
  const { colors, spacing, isDark } = useTheme();

  const [locationId, setLocationId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StockFilter>('all');
  const [fabOpen, setFabOpen] = useState(false);
  const [fabAction, setFabAction] = useState<MovementKind | null>(null);
  const [fabSearch, setFabSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const locationsQuery = useStockLocations();
  const overview = useStockOverview(locationId);

  const locations = locationsQuery.data ?? [];

  const rows = useMemo(() => {
    const needle = query.toLowerCase();
    return overview.rows
      .filter((row) =>
        needle ? row.offer.product.name.toLowerCase().includes(needle) : true,
      )
      .filter((row) => {
        if (filter === 'low') {
          return (
            row.availableQty > 0 &&
            stockLevelOf(row.availableQty, row.offer.minQuantity) === 'low'
          );
        }
        if (filter === 'out') {
          return row.availableQty <= 0;
        }
        return true;
      })
      .sort((a, b) =>
        a.offer.product.name.localeCompare(b.offer.product.name, 'ru'),
      );
  }, [overview.rows, query, filter]);

  const fabOffers = useMemo(() => {
    const needle = fabSearch.trim().toLowerCase();
    return overview.rows
      .filter((row) =>
        needle ? row.offer.product.name.toLowerCase().includes(needle) : true,
      )
      .sort((a, b) => b.availableQty - a.availableQty)
      .slice(0, 20);
  }, [overview.rows, fabSearch]);

  const openForm = (kind: MovementKind, offerId: string) => {
    setFabOpen(false);
    setFabAction(null);
    setFabSearch('');
    if (kind === 'TRANSFER') {
      router.push(`/wholesale/stock/${offerId}/transfer`);
    } else {
      router.push(`/wholesale/stock/${offerId}/movement?type=${kind}`);
    }
  };

  let content: React.ReactNode;
  if (overview.isLoading) {
    content = (
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Skeleton height={72} />
        <Skeleton height={72} />
        <Skeleton height={72} />
        <Skeleton height={72} />
        <Skeleton height={72} />
      </View>
    );
  } else if (overview.isError) {
    content = <ErrorState onRetry={() => overview.refetch()} />;
  } else if (overview.rows.length === 0) {
    content = (
      <EmptyState
        icon={Warehouse}
        title="Склад пуст"
        description="Добавьте приход через кнопку «+» — или создайте первое предложение в разделе Товары."
        action={{
          label: 'Добавить приход',
          onPress: () => setFabOpen(true),
        }}
      />
    );
  } else {
    content = (
      <FlatList
        data={rows}
        keyExtractor={(row) => row.offer.id}
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          // FAB (56) + поля: последняя строка прокручивается выше кнопки.
          paddingBottom: 96,
          gap: spacing.sm,
        }}
        renderItem={({ item }) => (
          <Card>
            <View style={{ paddingHorizontal: 12 }}>
              <StockRow
                title={item.offer.product.name}
                unit={item.offer.product.unit}
                priceKopecks={item.offer.price}
                minQuantity={item.offer.minQuantity}
                physicalQty={item.physicalQty}
                reservedQty={item.reservedQty}
                availableQty={item.availableQty}
                imageUrl={firstImage(item.offer.product.images)}
                onPress={() => router.push(`/wholesale/stock/${item.offer.id}`)}
                testID={`stock-row-${item.offer.id}`}
              />
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={Warehouse}
            title="Ничего не найдено"
            description={
              query
                ? `По запросу «${query}» позиций нет. Проверьте написание или сбросьте фильтры.`
                : 'В этом сегменте пусто.'
            }
          />
        }
        ListFooterComponent={
          <Text
            variant="caption"
            color="textSecondary"
            style={{ textAlign: 'center', paddingTop: spacing.sm }}
          >
            {`Позиций в списке: ${rows.length}`}
          </Text>
        }
      />
    );
  }

  return (
    <RoleScreen role="wholesale_seller" section="stock" title="Склад">
      <View style={{ flex: 1, width: '100%' }}>
        <View
          style={{
            paddingHorizontal: spacing.md,
            paddingTop: spacing.sm,
            paddingBottom: spacing.xs,
            gap: spacing.sm,
          }}
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
            allCaption="Суммарно по организации"
            disabled={locationsQuery.isLoading}
          />
          <SummaryCards totals={overview.totals} loading={overview.isLoading} />
          <SearchBar
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Найти по товару"
            testID="stock-search"
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
              label="Все"
              active={filter === 'all'}
              onPress={() => setFilter('all')}
              testID="stock-segment-all"
            />
            <FilterChip
              label="Мало"
              active={filter === 'low'}
              onPress={() => setFilter('low')}
              testID="stock-segment-low"
            />
            <FilterChip
              label="Нет в наличии"
              active={filter === 'out'}
              onPress={() => setFilter('out')}
              testID="stock-segment-out"
            />
          </View>
        </View>
        {content}
      </View>

      {/* FAB «+» в thumb zone: два шага — действие, затем позиция. */}
      {overview.rows.length > 0 || overview.isLoading ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Добавить движение"
          onPress={() => setFabOpen(true)}
          style={({ pressed }) => [
            {
              position: 'absolute',
              right: spacing.lg,
              bottom: spacing.lg,
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
              // Тёмная тема — граница вместо тени (правило проекта).
              ...(isDark
                ? { borderWidth: 1, borderColor: colors.borderStrong }
                : { elevation: 4 }),
            },
          ]}
          testID="stock-fab"
        >
          <Plus size={26} color={colors.onPrimary} />
        </Pressable>
      ) : null}

      {/* Шаг 1: выбор действия. */}
      {fabOpen && !fabAction ? (
        <FabActionDialog
          onClose={() => setFabOpen(false)}
          onPick={(kind) => setFabAction(kind)}
        />
      ) : null}

      {/* Шаг 2: выбор позиции. */}
      {fabOpen && fabAction ? (
        <FabOfferDialog
          kind={fabAction}
          search={fabSearch}
          onSearch={setFabSearch}
          offers={fabOffers}
          onBack={() => setFabAction(null)}
          onClose={() => setFabOpen(false)}
          onPick={(offerId) => openForm(fabAction, offerId)}
        />
      ) : null}
    </RoleScreen>
  );
}

/** Карточки сводки: позиции, всего единиц, мало осталось. */
function SummaryCards({
  totals,
  loading,
}: {
  totals: { positions: number; units: number; low: number };
  loading: boolean;
}) {
  const { colors, spacing } = useTheme();
  const cards = [
    { label: 'Позиций', value: totals.positions, color: colors.text },
    { label: 'Всего единиц', value: totals.units, color: colors.text },
    {
      label: 'Мало осталось',
      value: totals.low,
      color: totals.low > 0 ? colors.accent : colors.textSecondary,
    },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {cards.map((card) => (
        <Card key={card.label} style={{ flex: 1, padding: spacing.sm }}>
          {loading ? (
            <Skeleton height={22} width={40} />
          ) : (
            <Text
              variant="h3"
              mono
              style={{ color: card.color }}
              testID="stock-summary-value"
            >
              {card.value}
            </Text>
          )}
          <Text variant="caption" color="textSecondary" numberOfLines={2}>
            {card.label}
          </Text>
        </Card>
      ))}
    </View>
  );
}

/** Шит выбора действия. */
function FabActionDialog({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (kind: MovementKind) => void;
}) {
  const { colors, spacing, radii } = useTheme();
  return (
    <Dialog visible onClose={onClose} title="Что сделать на складе">
      <View style={{ gap: spacing.sm }}>
        {FAB_ACTIONS.map((action) => (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => onPick(action.key)}
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                minHeight: 64,
                paddingHorizontal: spacing.md,
                borderRadius: radii.sm,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            testID={`fab-action-${action.key}`}
          >
            <action.icon size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{action.label}</Text>
              <Text variant="caption" color="textSecondary">
                {action.hint}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </Dialog>
  );
}

/** Шит выбора позиции для действия. */
function FabOfferDialog({
  kind,
  search,
  onSearch,
  offers,
  onBack,
  onClose,
  onPick,
}: {
  kind: MovementKind;
  search: string;
  onSearch: (value: string) => void;
  offers: {
    offer: { id: string; product: { name: string; unit: string } };
    availableQty: number;
  }[];
  onBack: () => void;
  onClose: () => void;
  onPick: (offerId: string) => void;
}) {
  const { spacing, radii } = useTheme();
  const title =
    kind === 'RECEIPT'
      ? 'Приход: выбрать позицию'
      : kind === 'WRITE_OFF'
        ? 'Списание: выбрать позицию'
        : kind === 'ADJUSTMENT'
          ? 'Корректировка: выбрать позицию'
          : 'Перемещение: выбрать позицию';
  return (
    <Dialog visible onClose={onClose} title={title}>
      <View style={{ gap: spacing.sm }}>
        <SearchBar
          value={search}
          onChangeText={onSearch}
          placeholder="Найти по товару"
        />
        {offers.length === 0 ? (
          <Text variant="bodySmall" color="textSecondary">
            Активных предложений нет. Создайте первое в разделе Товары.
          </Text>
        ) : (
          <FlatList
            data={offers}
            keyExtractor={(row) => row.offer.id}
            style={{ maxHeight: 320 }}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.offer.product.name}, доступно ${item.availableQty}`}
                onPress={() => onPick(item.offer.id)}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    minHeight: 56,
                    paddingHorizontal: spacing.xs,
                    borderRadius: radii.sm,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                testID={`fab-offer-${item.offer.id}`}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="bodySmall" numberOfLines={1}>
                    {item.offer.product.name}
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    {`Доступно: ${item.availableQty} ${item.offer.product.unit}`}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        )}
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Назад к действиям"
        >
          <Text variant="bodySmall" color="primaryText">
            Назад к действиям
          </Text>
        </Pressable>
      </View>
    </Dialog>
  );
}
