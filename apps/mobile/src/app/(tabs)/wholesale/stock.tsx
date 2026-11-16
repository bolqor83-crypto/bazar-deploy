/**
 * Склад — обзор остатков (Промт 11b; редизайн Промта 12, Часть A).
 *
 * Плотность важнее воздуха: сводка — одна панель-полоса (56) с тремя
 * метриками; список — компактные строки StockRow (64) с разделителями
 * Divider вместо карточек; фильтры и поиск — одна строка (36).
 * FAB убран: «Добавить приход» — primary-кнопка в панели управления,
 * не перекрывает контент. Выбор позиции прихода — шит со списком.
 */
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Warehouse } from 'lucide-react-native';
import {
  Button,
  Dialog,
  Divider,
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
  const { spacing } = useTheme();

  const [locationId, setLocationId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StockFilter>('all');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

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

  /** Позиции для шита прихода: все активные предложения. */
  const pickerRows = useMemo(() => {
    const needle = pickerSearch.trim().toLowerCase();
    return overview.rows
      .filter((row) =>
        needle ? row.offer.product.name.toLowerCase().includes(needle) : true,
      )
      .sort((a, b) => b.physicalQty - a.physicalQty)
      .slice(0, 20);
  }, [overview.rows, pickerSearch]);

  const openReceipt = (offerId: string) => {
    setPickerOpen(false);
    setPickerSearch('');
    router.push(`/wholesale/stock/${offerId}/movement?type=RECEIPT`);
  };

  let content: React.ReactNode;
  if (overview.isLoading) {
    content = (
      <View
        style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
      >
        <Skeleton height={64} />
        <Skeleton height={64} />
        <Skeleton height={64} />
        <Skeleton height={64} />
        <Skeleton height={64} />
        <Skeleton height={64} />
      </View>
    );
  } else if (overview.isError) {
    content = <ErrorState onRetry={() => overview.refetch()} />;
  } else if (overview.rows.length === 0) {
    // Пустой склад: прижато к верху — фильтры и шапка остаются в кадре.
    content = (
      <EmptyState
        icon={Warehouse}
        title="Склад пуст"
        description="Добавьте первый приход по любой позиции — или создайте предложение в разделе Товары."
        compact
        action={{
          label: 'Добавить приход',
          onPress: () => setPickerOpen(true),
        }}
      />
    );
  } else {
    content = (
      <FlatList
        data={rows}
        keyExtractor={(row) => row.offer.id}
        contentContainerStyle={{
          paddingBottom: spacing.xl,
        }}
        ItemSeparatorComponent={() => (
          <View style={{ paddingHorizontal: spacing.md }}>
            <Divider />
          </View>
        )}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.md }}>
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
        )}
        ListEmptyComponent={
          <EmptyState
            icon={Warehouse}
            title="Ничего не найдено"
            compact
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
            style={{ textAlign: 'center', paddingTop: spacing.md }}
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
        {/* Панель управления: склад + приход, сводка, фильтры с поиском. */}
        <View
          style={{
            paddingHorizontal: spacing.md,
            gap: spacing.sm,
            paddingTop: spacing.sm,
            paddingBottom: spacing.xs,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            <View style={{ flex: 1 }}>
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
            </View>
            <Button
              size="sm"
              icon={Plus}
              onPress={() => setPickerOpen(true)}
              testID="stock-add-receipt"
            >
              Добавить приход
            </Button>
          </View>

          <SummaryBar totals={overview.totals} loading={overview.isLoading} />

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            <FilterChip
              label="Все"
              size="sm"
              active={filter === 'all'}
              onPress={() => setFilter('all')}
              testID="stock-segment-all"
            />
            <FilterChip
              label="Мало"
              size="sm"
              active={filter === 'low'}
              onPress={() => setFilter('low')}
              testID="stock-segment-low"
            />
            <FilterChip
              label="Нет"
              size="sm"
              active={filter === 'out'}
              onPress={() => setFilter('out')}
              testID="stock-segment-out"
            />
            <View style={{ flex: 1 }}>
              <SearchBar
                value={searchInput}
                onChangeText={setSearchInput}
                placeholder="Поиск…"
                compact
                accessibilityLabel="Поиск по товару"
                testID="stock-search"
              />
            </View>
          </View>
        </View>
        {content}
      </View>

      {/* Выбор позиции прихода (FAB убран — вход из панели управления). */}
      {pickerOpen ? (
        <ReceiptPickerDialog
          search={pickerSearch}
          onSearch={setPickerSearch}
          rows={pickerRows.map((row) => ({
            offerId: row.offer.id,
            name: row.offer.product.name,
            availableQty: row.availableQty,
          }))}
          onClose={() => {
            setPickerOpen(false);
            setPickerSearch('');
          }}
          onPick={openReceipt}
        />
      ) : null}
    </RoleScreen>
  );
}

/** Панель-сводка: одна полоса (56) с тремя метриками. */
function SummaryBar({
  totals,
  loading,
}: {
  totals: { positions: number; low: number; out: number };
  loading: boolean;
}) {
  const { colors, spacing } = useTheme();
  const metrics = [
    { label: 'Позиций', value: totals.positions, color: colors.text },
    {
      label: 'Мало',
      value: totals.low,
      color: totals.low > 0 ? colors.accent : colors.text,
    },
    {
      label: 'Нет',
      value: totals.out,
      color: totals.out > 0 ? colors.danger : colors.text,
    },
  ];
  return (
    <View
      accessibilityLabel={`Сводка: позиций ${totals.positions}, мало ${totals.low}, нет ${totals.out}`}
      style={{
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
      }}
    >
      {metrics.map((metric, index) => (
        <View
          key={metric.label}
          style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}
        >
          {index > 0 ? (
            <Text
              variant="bodySmall"
              color="textMuted"
              style={{ paddingRight: 4 }}
            >
              ·
            </Text>
          ) : null}
          <Text variant="caption" color="textSecondary">
            {metric.label}
          </Text>
          {loading ? (
            <Skeleton height={20} width={28} />
          ) : (
            <Text variant="bodyStrong" mono style={{ color: metric.color }}>
              {metric.value}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

/** Шит выбора позиции для прихода. */
function ReceiptPickerDialog({
  search,
  onSearch,
  rows,
  onClose,
  onPick,
}: {
  search: string;
  onSearch: (value: string) => void;
  rows: {
    offerId: string;
    name: string;
    availableQty: number;
  }[];
  onClose: () => void;
  onPick: (offerId: string) => void;
}) {
  const { spacing } = useTheme();
  return (
    <Dialog visible onClose={onClose} title="Приход: выбрать позицию">
      <View style={{ gap: spacing.sm }}>
        <SearchBar
          value={search}
          onChangeText={onSearch}
          placeholder="Найти по товару"
          accessibilityLabel="Поиск позиции для прихода"
        />
        {rows.length === 0 ? (
          <Text variant="body" color="textSecondary">
            Активных предложений нет. Создайте первое в разделе Товары — затем
            принимайте товар на склад.
          </Text>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(row) => row.offerId}
            style={{ maxHeight: 320 }}
            renderItem={({ item }) => (
              <ReceiptPickRow
                name={item.name}
                availableQty={item.availableQty}
                onPress={() => onPick(item.offerId)}
              />
            )}
          />
        )}
      </View>
    </Dialog>
  );
}

/** Строка позиции в шите прихода. */
function ReceiptPickRow({
  name,
  availableQty,
  onPress,
}: {
  name: string;
  availableQty: number;
  onPress: () => void;
}) {
  const { spacing } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, доступно ${availableQty}`}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 56,
          paddingVertical: spacing.xs,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
        {name}
      </Text>
      <Text variant="caption" color="textSecondary" mono>
        {`Доступно: ${availableQty}`}
      </Text>
    </Pressable>
  );
}
