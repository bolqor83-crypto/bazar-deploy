/**
 * Лента (feed) — экран роли «перевозчик» (Промт 10, Часть D).
 *
 * Свободные заявки на перевозку (PENDING): карточка маршрута
 * «забор → выгрузка», груз и инициатор. «Принять» — крупная
 * кнопка на карточке; в диалоге можно указать ставку. Принятый
 * рейс уходит в «Мои доставки». Загрузка — Skeleton, пусто —
 * EmptyState, ошибка — ErrorState.
 */
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Newspaper } from 'lucide-react-native';
import {
  Button,
  DeliveryRequestCard,
  Dialog,
  EmptyState,
  ErrorState,
  Input,
  Skeleton,
  Text,
  useToast,
  useTheme,
} from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';
import {
  useCarrierDeliveries,
  useCarrierDeliveryAction,
} from '../../../hooks/useDeliveries';

function FeedSkeleton() {
  const { spacing } = useTheme();
  return (
    <View style={{ padding: spacing.lg, gap: spacing.md }}>
      <Skeleton height={168} />
      <Skeleton height={168} />
    </View>
  );
}

export default function CarrierFeedScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const { show } = useToast();
  const feedQuery = useCarrierDeliveries('feed');
  const accept = useCarrierDeliveryAction();
  const [dialogDeliveryId, setDialogDeliveryId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState('');

  const deliveries = feedQuery.data?.items ?? [];
  const dialogDelivery = deliveries.find((d) => d.id === dialogDeliveryId);

  const onAccept = () => {
    if (!dialogDelivery) return;
    const trimmed = priceInput.trim();
    const rubles = Number.parseInt(trimmed, 10);
    const kopecks =
      trimmed.length > 0 && Number.isFinite(rubles) && rubles >= 0
        ? rubles * 100
        : undefined;
    const id = dialogDelivery.id;
    const number = dialogDelivery.number;
    setDialogDeliveryId(null);
    accept.mutate(
      { id, action: 'accept', priceKopecks: kopecks },
      {
        onSuccess: () =>
          show({
            variant: 'success',
            message: `Заявка ${number} принята — рейс в «Мои доставки»`,
          }),
        onError: () =>
          show({
            variant: 'error',
            message: 'Заявку уже забрали или связь потеряна — обновите ленту',
          }),
      },
    );
  };

  return (
    <RoleScreen role="carrier" section="feed" title="Лента">
      {feedQuery.isError ? (
        <ErrorState
          title="Лента не загрузилась"
          description="Проверьте соединение и попробуйте снова"
          onRetry={() => void feedQuery.refetch()}
        />
      ) : feedQuery.isPending ? (
        <FeedSkeleton />
      ) : deliveries.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="Свободных заявок пока нет"
          description="Заявки на перевозку от торговых точек и оптовиков появятся здесь — стоит заглянуть позже."
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        >
          {deliveries.map((delivery) => (
            <DeliveryRequestCard
              key={delivery.id}
              testID={`carrier-feed-card-${delivery.id}`}
              number={delivery.number}
              status={delivery.status}
              pickupAddress={delivery.pickupAddress}
              dropoffAddress={delivery.dropoffAddress}
              weightKg={delivery.weightKg}
              volumeL={delivery.volumeL}
              requesterName={delivery.requesterName}
              onPress={() => router.push(`/carrier/deliveries/${delivery.id}`)}
            >
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onPress={() => {
                  setPriceInput('');
                  setDialogDeliveryId(delivery.id);
                }}
                testID={`carrier-feed-accept-${delivery.id}`}
              >
                Принять заявку
              </Button>
            </DeliveryRequestCard>
          ))}
          <Text
            variant="caption"
            color="textMuted"
            style={{ textAlign: 'center', paddingTop: spacing.xs }}
          >
            Показаны все свободные заявки — новые появятся, как только их
            оформят точки и оптовики
          </Text>
        </ScrollView>
      )}

      {/* Диалог принятия: необязательная ставка. */}
      <Dialog
        visible={dialogDelivery !== undefined}
        onClose={() => setDialogDeliveryId(null)}
        title={dialogDelivery ? `Принять заявку ${dialogDelivery.number}` : ''}
        dismissable
      >
        <Text
          variant="body"
          color="textSecondary"
          style={{ marginBottom: spacing.md }}
        >
          Рейс появится в «Мои доставки». Ставку можно указать сейчас или
          согласовать с отправителем.
        </Text>
        <Input
          label="Ставка, ₽"
          placeholder="Например, 1500"
          value={priceInput}
          onChangeText={setPriceInput}
          keyboardType="numeric"
          accessibilityLabel="Ставка в рублях"
        />
        <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={accept.isPending}
            onPress={onAccept}
            testID="carrier-feed-accept-confirm"
          >
            Принять рейс
          </Button>
          <Button
            variant="ghost"
            size="lg"
            fullWidth
            onPress={() => setDialogDeliveryId(null)}
          >
            Позже
          </Button>
        </View>
      </Dialog>
    </RoleScreen>
  );
}
