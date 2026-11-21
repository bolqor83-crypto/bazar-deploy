/**
 * Экран аналитики продавца — AI Layer 1 (Промт 18, Часть D).
 *
 * Секции: тренды цен (TrendCard), объёмы продаж (VolumeChart),
 * топ-товары (TopProductsList), аномалии (AnomalyList).
 * Данные — TanStack Query (staleTime 5 минут, как TTL кэша API),
 * состояния: skeleton / empty / error+retry. Период — day/week/
 * month через SegmentedControl.
 */
import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  AnomalyList,
  ErrorState,
  SegmentedControl,
  Skeleton,
  Text,
  TopProductsList,
  TrendCard,
  VolumeChart,
  useTheme,
  type SegmentedOption,
} from '@bazar/ui';
import type {
  AnalyticsPeriod,
  AnomaliesResponse,
  PriceTrendsResponse,
  VolumesResponse,
} from '@bazar/types';
import {
  fetchAnomalies,
  fetchPriceTrends,
  fetchVolumeTrends,
} from '../../services/api/marketApi';

const PERIOD_OPTIONS: SegmentedOption<AnalyticsPeriod>[] = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
];

const PERIOD_LABEL: Record<AnalyticsPeriod, string> = {
  day: 'за день',
  week: 'за неделю',
  month: 'за месяц',
};

/** Секция с заголовком. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing.xl }}>
      <Text variant="h3" style={{ marginBottom: spacing.md }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

/** Скелетон секции. */
function SectionSkeleton({ rows = 2 }: { rows?: number }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.md }}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={84} width="100%" />
      ))}
    </View>
  );
}

export function AnalyticsScreen() {
  const { spacing } = useTheme();
  const [period, setPeriod] = useState<AnalyticsPeriod>('week');

  const trends = useQuery<PriceTrendsResponse>({
    queryKey: ['market-trends', period],
    queryFn: () => fetchPriceTrends(period),
    staleTime: 5 * 60_000,
  });
  const volumes = useQuery<VolumesResponse>({
    queryKey: ['market-volumes', period],
    queryFn: () => fetchVolumeTrends(period),
    staleTime: 5 * 60_000,
  });
  const anomalies = useQuery<AnomaliesResponse>({
    queryKey: ['market-anomalies', period],
    queryFn: () => fetchAnomalies(period),
    staleTime: 5 * 60_000,
  });

  const hasAnyData =
    (trends.data?.items.length ?? 0) > 0 ||
    (volumes.data?.items.length ?? 0) > 0;

  return (
    <ScrollView
      contentContainerStyle={{
        padding: spacing.xl,
        paddingBottom: spacing.xxxl,
      }}
    >
      <SegmentedControl
        options={PERIOD_OPTIONS}
        value={period}
        onChange={setPeriod}
        testID="analytics-period"
      />

      {trends.isLoading && volumes.isLoading ? (
        <View style={{ marginTop: spacing.xl, gap: spacing.xl }}>
          <SectionSkeleton rows={2} />
          <SectionSkeleton rows={3} />
        </View>
      ) : !hasAnyData && (trends.isSuccess || volumes.isSuccess) ? (
        <View style={{ marginTop: spacing.xl }}>
          <ErrorState
            title="Пока нет данных"
            description="Продажи появятся, когда будут заказы. Как только рынок оживёт — здесь будут тренды, объёмы и аномалии."
          />
        </View>
      ) : (
        <View style={{ marginTop: spacing.xl }}>
          <Section title="Тренды цен">{renderTrends(trends, spacing)}</Section>
          <Section title="Объёмы продаж">{renderVolumes(volumes)}</Section>
          <Section title="Топ-товары">{renderTop(volumes)}</Section>
          <Section title="Аномалии">{renderAnomalies(anomalies)}</Section>
        </View>
      )}
    </ScrollView>
  );
}

/** Тренды: карточки-колонки, переносятся по две. */
function renderTrends(
  trends: UseQueryResult<PriceTrendsResponse>,
  spacing: ReturnType<typeof useTheme>['spacing'],
) {
  if (trends.isLoading) {
    return <SectionSkeleton rows={2} />;
  }
  if (trends.isError) {
    return (
      <ErrorState
        description="Не удалось загрузить тренды"
        onRetry={() => {
          void trends.refetch();
        }}
      />
    );
  }
  const items = trends.data?.items ?? [];
  if (items.length === 0) {
    return (
      <Text variant="bodySmall" color="textSecondary">
        Нет активных предложений.
      </Text>
    );
  }
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
      }}
    >
      {items.map((item) => (
        <TrendCard
          key={item.categoryId}
          categoryName={item.categoryName}
          avgPriceKopecks={item.avgPriceKopecks}
          changePercent={item.changePercent}
          offers={item.offers}
        />
      ))}
    </View>
  );
}

/** Объёмы: бар-чарт по товарам. */
function renderVolumes(volumes: UseQueryResult<VolumesResponse>) {
  if (volumes.isLoading) {
    return <SectionSkeleton rows={3} />;
  }
  if (volumes.isError) {
    return (
      <ErrorState
        description="Не удалось загрузить объёмы"
        onRetry={() => {
          void volumes.refetch();
        }}
      />
    );
  }
  const items = volumes.data?.items ?? [];
  if (items.length === 0) {
    return (
      <Text variant="bodySmall" color="textSecondary">
        Заказов за период не было.
      </Text>
    );
  }
  return <VolumeChart items={items.slice(0, 6)} testID="analytics-volumes" />;
}

/** Топ-товары: первые 10 по объёму. */
function renderTop(volumes: UseQueryResult<VolumesResponse>) {
  if (volumes.isLoading || volumes.isError) {
    return null;
  }
  const items = volumes.data?.items ?? [];
  if (items.length === 0) {
    return null;
  }
  return <TopProductsList items={items.slice(0, 10)} testID="analytics-top" />;
}

/** Аномалии. */
function renderAnomalies(anomalies: UseQueryResult<AnomaliesResponse>) {
  if (anomalies.isLoading) {
    return <SectionSkeleton rows={1} />;
  }
  if (anomalies.isError) {
    return (
      <ErrorState
        description="Не удалось загрузить аномалии"
        onRetry={() => {
          void anomalies.refetch();
        }}
      />
    );
  }
  return (
    <AnomalyList
      items={anomalies.data?.items ?? []}
      testID="analytics-anomalies"
    />
  );
}
