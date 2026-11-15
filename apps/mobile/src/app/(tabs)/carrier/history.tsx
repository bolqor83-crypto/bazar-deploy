/**
 * История (history) — экран роли «перевозчик» (Промт 10, Часть D).
 *
 * Рейсы и расчёты: сводка заработанного по завершённым рейсам
 * (ставки, суммы табличными цифрами) и лента всех прошлых
 * доставок — завершённых и отменённых.
 */
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { History } from 'lucide-react-native';
import {
  Card,
  DeliveryRequestCard,
  EmptyState,
  ErrorState,
  Skeleton,
  Text,
  useTheme,
} from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';
import { useCarrierDeliveries } from '../../../hooks/useDeliveries';

function HistorySkeleton() {
  const { spacing } = useTheme();
  return (
    <View style={{ padding: spacing.lg, gap: spacing.md }}>
      <Skeleton height={88} />
      <Skeleton height={168} />
      <Skeleton height={168} />
    </View>
  );
}

export default function CarrierHistoryScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const mineQuery = useCarrierDeliveries('mine');

  const all = mineQuery.data?.items ?? [];
  const completed = all.filter((d) => d.status === 'COMPLETED');
  const past = all.filter(
    (d) => d.status === 'COMPLETED' || d.status === 'CANCELLED',
  );
  const earnedKopecks = completed.reduce((sum, d) => sum + (d.price ?? 0), 0);
  const earnedRub = Math.round(earnedKopecks / 100).toLocaleString('ru-RU');

  return (
    <RoleScreen role="carrier" section="history" title="История">
      {mineQuery.isError ? (
        <ErrorState
          title="История не загрузилась"
          description="Проверьте соединение и попробуйте снова"
          onRetry={() => void mineQuery.refetch()}
        />
      ) : mineQuery.isPending ? (
        <HistorySkeleton />
      ) : past.length === 0 ? (
        <EmptyState
          icon={History}
          title="История доставок пуста"
          description="Завершённые рейсы и расчёты по ним будут сохраняться здесь."
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        >
          <Card testID="carrier-earnings">
            <Text variant="bodyStrong" style={{ marginBottom: spacing.xs }}>
              Заработано по завершённым рейсам
            </Text>
            <Text variant="h2" mono>
              {`${earnedRub} ₽`}
            </Text>
            <Text variant="caption" color="textSecondary">
              {completed.length === 0
                ? 'Завершённых рейсов пока нет'
                : `${completed.length} ${completed.length === 1 ? 'рейс' : completed.length < 5 ? 'рейса' : 'рейсов'} подтверждено получателями`}
            </Text>
          </Card>

          {past.map((delivery) => (
            <DeliveryRequestCard
              key={delivery.id}
              testID={`history-card-${delivery.id}`}
              number={delivery.number}
              status={delivery.status}
              pickupAddress={delivery.pickupAddress}
              dropoffAddress={delivery.dropoffAddress}
              weightKg={delivery.weightKg}
              volumeL={delivery.volumeL}
              priceKopecks={delivery.price}
              requesterName={delivery.requesterName}
              onPress={() => router.push(`/carrier/deliveries/${delivery.id}`)}
            />
          ))}
        </ScrollView>
      )}
    </RoleScreen>
  );
}
