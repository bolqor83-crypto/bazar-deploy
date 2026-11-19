/**
 * Запросы цен — экран оптовика (Промт 16, Часть C).
 *
 * Входящие запросы покупателей на офферы организации
 * «цена по запросу»: покупатель, товар, количество, сообщение.
 * Действия продавца: ответить персональной ценой (72 часа)
 * или отклонить. Обработанные запросы остаются в списке
 * (статус + цена и срок действия предложения).
 */
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Inbox, MessageSquareText } from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  Input,
  Skeleton,
  Text,
  useTheme,
  useToast,
  formatPrice,
} from '@bazar/ui';
import type { PriceRequest } from '@bazar/types';
import { PRICE_REQUEST_STATUS_LABELS } from '@bazar/types';
import {
  useDeclinePriceRequest,
  useIncomingPriceRequests,
  useRespondPriceRequest,
} from '../../../hooks/usePriceRequests';
import { RoleScreen } from '../../../components/shell/RoleScreen';

/** Форма ответа: цена в рублях (копейки — на сервере). */
function isPriceValid(rubles: string): boolean {
  const value = Number(rubles.replace(',', '.'));
  return Number.isFinite(value) && value > 0 && value <= 1_000_000;
}

function IncomingRow({ request }: { request: PriceRequest }) {
  const { colors, spacing, radii } = useTheme();
  const { show } = useToast();
  const respond = useRespondPriceRequest();
  const decline = useDeclinePriceRequest();
  const [respondOpen, setRespondOpen] = useState(false);
  const [priceRubles, setPriceRubles] = useState('');

  const buyerName = request.buyer?.name ?? '—';
  const pending = request.status === 'PENDING';

  const submitRespond = () => {
    const rublesValue = Number(priceRubles.replace(',', '.'));
    if (!Number.isFinite(rublesValue) || rublesValue <= 0) {
      return;
    }
    respond.mutate(
      { id: request.id, price: Math.round(rublesValue * 100) },
      {
        onSuccess: () => {
          setRespondOpen(false);
          show({
            variant: 'success',
            message: 'Персональная цена отправлена — действует 72 часа',
          });
        },
        onError: () => {
          show({
            variant: 'info',
            message: 'Не удалось отправить — попробуйте ещё раз',
          });
        },
      },
    );
  };

  return (
    <Card variant="outlined" testID="incoming-price-request">
      <View style={{ gap: spacing.sm }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: spacing.sm,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="bodyStrong" numberOfLines={2}>
              {request.offer.product.name}
            </Text>
            <Text variant="caption" color="textSecondary">
              {buyerName} · {request.quantity} × {request.offer.product.unit}
            </Text>
          </View>
          <Badge variant={pending ? 'info' : 'neutral'} size="sm">
            {request.expired
              ? 'Срок истёк'
              : PRICE_REQUEST_STATUS_LABELS[request.status]}
          </Badge>
        </View>

        {request.message ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: spacing.xs,
              padding: spacing.sm,
              backgroundColor: colors.surfaceMuted,
              borderRadius: radii.sm,
            }}
          >
            <MessageSquareText size={16} color={colors.textSecondary} />
            <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
              {request.message}
            </Text>
          </View>
        ) : null}

        {request.status === 'ANSWERED' &&
        request.quotedPriceKopecks !== null ? (
          <Text variant="caption" color="textSecondary" mono>
            {`Ответ: ${formatPrice(request.quotedPriceKopecks)} за ${
              request.offer.product.unit
            }${request.expired ? ' — срок истёк' : ''}`}
          </Text>
        ) : null}

        {pending ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => setRespondOpen(true)}
              testID="respond-price-open"
            >
              Ответить ценой
            </Button>
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              disabled={decline.isPending}
              onPress={() =>
                decline.mutate(
                  { id: request.id },
                  {
                    onError: () => {
                      show({
                        variant: 'info',
                        message: 'Не удалось отклонить — попробуйте ещё раз',
                      });
                    },
                  },
                )
              }
              testID="decline-price-request"
            >
              Отклонить
            </Button>
          </View>
        ) : null}
      </View>

      {/* Шит ответа: цена за единицу в рублях. */}
      <Dialog
        visible={respondOpen}
        onClose={() => setRespondOpen(false)}
        title="Персональная цена"
      >
        <View style={{ gap: spacing.md, paddingBottom: spacing.sm }}>
          <Text variant="body" color="textSecondary">
            {request.offer.product.name} · {request.quantity} ×{' '}
            {request.offer.product.unit}. Цена будет действовать 72 часа.
          </Text>
          <Input
            label="Цена за единицу, ₽"
            value={priceRubles}
            onChangeText={setPriceRubles}
            keyboardType="decimal-pad"
            placeholder="250"
            error={
              priceRubles.length > 0 && !isPriceValid(priceRubles)
                ? 'Введите цену больше нуля'
                : null
            }
            testID="respond-price-input"
          />
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!isPriceValid(priceRubles) || respond.isPending}
            onPress={submitRespond}
            testID="respond-price-submit"
          >
            {respond.isPending ? 'Отправляем…' : 'Отправить предложение'}
          </Button>
        </View>
      </Dialog>
    </Card>
  );
}

export default function RequestsScreen() {
  const { spacing } = useTheme();
  const query = useIncomingPriceRequests();
  const items = query.data?.items ?? [];
  // Живые запросы — первыми, обработанные — ниже.
  const sorted = [...items].sort((a, b) => {
    const pending = (r: PriceRequest) => (r.status === 'PENDING' ? 0 : 1);
    return pending(a) - pending(b);
  });

  return (
    <RoleScreen role="wholesale_seller" section="requests" title="Запросы цен">
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.md,
          flexGrow: 1,
        }}
      >
        {query.isError ? (
          <ErrorState
            title="Запросы не загрузились"
            description="Проверьте соединение и попробуйте снова"
            onRetry={() => void query.refetch()}
          />
        ) : query.isPending ? (
          <>
            <Skeleton height={120} />
            <Skeleton height={120} />
          </>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Запросов пока нет"
            description="Покупатели просят цену на предложения с включённым режимом «Цена по запросу»."
          />
        ) : (
          sorted.map((request) => (
            <IncomingRow key={request.id} request={request} />
          ))
        )}
      </ScrollView>
    </RoleScreen>
  );
}
