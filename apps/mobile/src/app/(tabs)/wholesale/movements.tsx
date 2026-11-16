/**
 * Движения — общий журнал по всем позициям склада (Промт 12, Часть D).
 *
 * Компактные строки MovementRow (56) с названием позиции, бесконечная
 * прокрутка, состояния loading/empty/error. Данные — существующий
 * эндпоинт /stock/movements без фильтра по офферу (ADR 0012).
 */
import { useMemo } from 'react';
import { FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { History } from 'lucide-react-native';
import {
  Divider,
  EmptyState,
  ErrorState,
  MovementRow,
  Skeleton,
  Text,
  useTheme,
} from '@bazar/ui';
import type { MovementType } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';
import { useStockMovements } from '../../../hooks/useStock';

export default function StockMovementsJournalScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const movementsQuery = useStockMovements({ pageSize: 30 });

  const movements = useMemo(
    () => movementsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [movementsQuery.data],
  );
  const total = movementsQuery.data?.pages[0]?.total ?? 0;

  let content: React.ReactNode;
  if (movementsQuery.isLoading) {
    content = (
      <View
        style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
      >
        <Skeleton height={56} />
        <Skeleton height={56} />
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
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        onEndReached={() => {
          if (
            movementsQuery.hasNextPage &&
            !movementsQuery.isFetchingNextPage
          ) {
            void movementsQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
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
              offerTitle={item.offerTitle}
              onPress={() => router.push(`/wholesale/stock/${item.offerId}`)}
              testID={`movement-${item.id}`}
            />
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={History}
            title="Движений пока нет"
            compact
            description="Первый приход появится здесь автоматически — журнал ведёт система."
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
    <RoleScreen role="wholesale_seller" section="movements" title="Движения">
      <View style={{ flex: 1, width: '100%' }}>
        <View
          style={{
            paddingHorizontal: spacing.md,
            paddingTop: spacing.sm,
            paddingBottom: spacing.xs,
          }}
        >
          <Text variant="caption" color="textSecondary">
            {`Журнал по всем позициям · ${total}`}
          </Text>
        </View>
        {content}
      </View>
    </RoleScreen>
  );
}
