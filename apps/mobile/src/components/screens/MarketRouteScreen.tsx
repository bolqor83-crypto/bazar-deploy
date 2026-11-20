/**
 * Маршрут по рынку — экран покупателя и владельца точки
 * (Промт 17, Часть B).
 *
 * Сверху вниз: шапка с «Назад», сводка («5 точек · 640 м · ~9 мин
 * пешком» + прогресс «Пройдено 2 из 5»), схема рынка <MarketMap>,
 * переключатель «Вернуться к выходу», warning о продавцах без
 * позиции, список остановок <RouteStopRow> в порядке обхода.
 * Отметки «Пройдено» — локальные, по дню, оптимистичные.
 */
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, MapPinOff } from 'lucide-react-native';
import {
  Button,
  EmptyState,
  ErrorState,
  MarketMap,
  RouteStopRow,
  Skeleton,
  Switch,
  Text,
  useTheme,
} from '@bazar/ui';
import { useMarketRoute, useMarketVisited } from '../../hooks/useMarketRoute';

export interface MarketRouteScreenProps {
  basePath: 'customer' | 'store';
}

export default function MarketRouteScreen({
  basePath,
}: MarketRouteScreenProps) {
  const router = useRouter();
  const { colors, spacing, radii } = useTheme();
  const [returnToStart, setReturnToStart] = useState(false);
  const routeQuery = useMarketRoute(returnToStart);
  const { visited, toggleVisited } = useMarketVisited();

  const header = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Назад"
        hitSlop={8}
        onPress={() => router.back()}
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
        <ChevronLeft size={22} color={colors.text} />
      </Pressable>
      <Text variant="h2" numberOfLines={1} style={{ flex: 1 }}>
        Маршрут по рынку
      </Text>
    </View>
  );

  if (routeQuery.isError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: spacing.lg }}
        >
          {header}
          <ErrorState
            title="Маршрут не построился"
            description="Проверьте соединение и попробуйте снова"
            onRetry={() => void routeQuery.refetch()}
          />
        </ScrollView>
      </View>
    );
  }

  if (routeQuery.isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: spacing.lg }}
        >
          {header}
          <View style={{ gap: spacing.md }}>
            <Skeleton height={56} />
            <Skeleton height={240} />
            <Skeleton height={72} />
            <Skeleton height={72} />
            <Skeleton height={72} />
          </View>
        </ScrollView>
      </View>
    );
  }

  const route = routeQuery.data;
  const stops = route?.stops ?? [];
  const unlocated = route?.unlocated ?? [];
  const visitedCount = stops.filter((s) => visited.includes(s.orderId)).length;
  const sellerNames = stops.map((s) => s.seller.name).join(', ');

  if (stops.length === 0 && unlocated.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: spacing.lg }}
        >
          {header}
          <EmptyState
            icon={MapPinOff}
            title="Нет подтверждённых заказов"
            description={
              'Маршрут строится по заказам «Подтверждён / Собирается / Готов к выдаче»'
            }
            action={{
              label: 'К заказам',
              onPress: () => router.replace(`/${basePath}/orders`),
            }}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.md,
          paddingBottom: spacing.xl,
        }}
      >
        {header}

        {/* Сводка-полоса */}
        <View
          style={{
            minHeight: 56,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            paddingHorizontal: spacing.md,
            borderRadius: radii.lg,
            backgroundColor: colors.surfaceMuted,
          }}
          testID="market-route-summary"
        >
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              columnGap: 6,
              flex: 1,
            }}
          >
            <Text variant="body">
              <Text variant="bodyStrong">{stops.length} точек</Text>
              {` · ${route?.totalMeters ?? 0} м`}
            </Text>
            {/* Целая строка-единица: «~2 мин пешком» не рвётся
                посередине на узких экранах (VLM-ревью Промта 17). */}
            <Text variant="body">{`~${route?.estimatedMinutes ?? 0} мин пешком`}</Text>
          </View>
          {visitedCount > 0 ? (
            <Text variant="bodySmall" color="textSecondary">
              {`Пройдено ${visitedCount} из ${stops.length}`}
            </Text>
          ) : null}
        </View>

        {/* Схема рынка */}
        {stops.length > 0 ? (
          <MarketMap
            rows={route?.market.rows ?? 4}
            spots={route?.market.spots ?? 40}
            entrance={route?.market.entrance ?? { row: 0, spot: 0 }}
            stops={stops.map((stop, index) => ({
              row: stop.row,
              spot: stop.spot,
              index: index + 1,
              visited: visited.includes(stop.orderId),
            }))}
            returnToStart={returnToStart}
            a11yLabel={`Схема рынка: ${stops.length} точек, ${route?.totalMeters ?? 0} метров, порядок: ${sellerNames}`}
            testID="market-route-map"
          />
        ) : null}

        {/* Вернуться к выходу */}
        <Switch
          value={returnToStart}
          onChange={setReturnToStart}
          label="Вернуться к выходу"
          hint={
            returnToStart && route?.returnLegMeters != null
              ? `+${route.returnLegMeters} м до входа`
              : 'Замкнуть маршрут к парковке'
          }
          testID="market-route-return"
        />

        {/* Продавцы без позиции на схеме */}
        {unlocated.length > 0 ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: spacing.sm,
              padding: spacing.md,
              borderRadius: radii.lg,
              backgroundColor: colors.accentSoft,
            }}
            testID="market-route-unlocated"
          >
            <Text variant="bodySmall" color="accentText" style={{ flex: 1 }}>
              {unlocated.length === 1
                ? `У продавца «${unlocated[0]?.sellerName}» нет точки на схеме (заказ ${unlocated[0]?.orderNumber}). Заказ не включён — уточните адрес самовывоза`
                : `У ${unlocated.length} продавцов нет точки на схеме (${unlocated
                    .map((u) => u.sellerName)
                    .join(
                      ', ',
                    )}). Заказы не включены — уточните адрес самовывоза`}
            </Text>
          </View>
        ) : null}

        {/* Остановки в порядке обхода */}
        <View style={{ gap: spacing.xs }}>
          {stops.map((stop, index) => (
            <RouteStopRow
              key={stop.orderId}
              index={index + 1}
              sellerName={stop.seller.name}
              row={stop.row}
              spot={stop.spot}
              orderNumber={stop.orderNumber}
              status={stop.status}
              itemsCount={stop.itemsCount}
              total={stop.total}
              legMeters={stop.legMeters}
              visited={visited.includes(stop.orderId)}
              onToggleVisited={() => toggleVisited(stop.orderId)}
              onOpenOrder={() =>
                router.push(`/${basePath}/orders/${stop.orderId}`)
              }
              testID={`market-route-stop-${index + 1}`}
            />
          ))}
          {route?.truncated ? (
            <Text
              variant="caption"
              color="textMuted"
              style={{ padding: spacing.sm }}
            >
              Показаны первые 20 заказов — маршрут построен по части покупок
            </Text>
          ) : null}
        </View>

        <Button
          variant="secondary"
          size="lg"
          onPress={() => router.replace(`/${basePath}/orders`)}
        >
          К заказам
        </Button>
      </ScrollView>
    </View>
  );
}
