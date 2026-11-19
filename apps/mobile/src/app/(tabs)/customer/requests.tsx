/**
 * Мои запросы цены — экран покупателя (Промт 16, Часть C).
 *
 * Список запросов по офферам «цена по запросу»: статус
 * (Ждёт ответа / Предложение готово / Отклонён), персональная
 * цена и срок действия (72 часа). По живому предложению — кнопка
 * «В корзину по этой цене» (добавляет позицию с quote).
 */
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import {
  ChevronRight,
  Clock3,
  MessageSquareText,
  XCircle,
} from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
  Text,
  useTheme,
  useToast,
  formatPrice,
} from '@bazar/ui';
import type { PriceRequest } from '@bazar/types';
import { PRICE_REQUEST_STATUS_LABELS } from '@bazar/types';
import { useAddToCart } from '../../../hooks/useCart';
import { useMyPriceRequests } from '../../../hooks/usePriceRequests';
import { RoleScreen } from '../../../components/shell/RoleScreen';

/** Дата-время «до 21.11, 14:30» для срока предложения. */
function validUntilLabel(request: PriceRequest): string {
  if (!request.validUntil) {
    return '';
  }
  const date = new Date(request.validUntil);
  return `до ${date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function RequestRow({ request }: { request: PriceRequest }) {
  const { colors, spacing, radii } = useTheme();
  const { show } = useToast();
  const addToCart = useAddToCart();

  const canBuy =
    request.status === 'ANSWERED' &&
    !request.expired &&
    request.quotedPriceKopecks !== null;

  const statusBadge =
    request.status === 'PENDING' ? (
      <Badge variant="info" size="sm">
        {PRICE_REQUEST_STATUS_LABELS[request.status]}
      </Badge>
    ) : request.status === 'ANSWERED' ? (
      <Badge variant={request.expired ? 'neutral' : 'success'} size="sm">
        {request.expired
          ? 'Срок истёк'
          : PRICE_REQUEST_STATUS_LABELS[request.status]}
      </Badge>
    ) : (
      <Badge variant="neutral" size="sm">
        {PRICE_REQUEST_STATUS_LABELS[request.status]}
      </Badge>
    );

  return (
    <Card variant="outlined" testID="price-request-row">
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
              {request.offer.organization.name} · {request.quantity} ×{' '}
              {request.offer.product.unit}
            </Text>
          </View>
          {statusBadge}
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
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
            }}
          >
            <Clock3
              size={16}
              color={request.expired ? colors.textMuted : colors.textSecondary}
            />
            <Text
              variant="bodyStrong"
              mono
              color={request.expired ? 'textMuted' : 'text'}
            >
              {formatPrice(request.quotedPriceKopecks)}
            </Text>
            <Text variant="caption" color="textSecondary">
              за {request.offer.product.unit}
              {request.expired
                ? ' — срок истёк'
                : ` · ${validUntilLabel(request)}`}
            </Text>
          </View>
        ) : null}

        {request.status === 'DECLINED' ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
            }}
          >
            <XCircle size={16} color={colors.textMuted} />
            <Text variant="caption" color="textSecondary">
              Продавец не смог предложить цену
            </Text>
          </View>
        ) : null}

        {canBuy ? (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={addToCart.isPending}
            onPress={() =>
              addToCart.mutate(
                {
                  offerId: request.offerId,
                  quantity: request.quantity,
                  priceRequestId: request.id,
                },
                {
                  onSuccess: () => {
                    show({
                      variant: 'success',
                      message: 'Добавлено в корзину по персональной цене',
                    });
                  },
                  onError: () => {
                    show({
                      variant: 'info',
                      message: 'Не удалось добавить — проверьте наличие',
                    });
                  },
                },
              )
            }
            testID="add-by-quote"
          >
            В корзину по этой цене
          </Button>
        ) : null}
      </View>
    </Card>
  );
}

export default function RequestsScreen() {
  const { colors, spacing } = useTheme();
  const requestsQuery = useMyPriceRequests();
  const [tab, setTab] = useState<'all' | 'PENDING' | 'ANSWERED' | 'DECLINED'>(
    'all',
  );

  const items = requestsQuery.data?.items ?? [];
  const filtered =
    tab === 'all' ? items : items.filter((r) => r.status === tab);

  const tabs: { key: typeof tab; label: string }[] = [
    { key: 'all', label: 'Все' },
    { key: 'PENDING', label: 'Ждут' },
    { key: 'ANSWERED', label: 'Готовы' },
    { key: 'DECLINED', label: 'Отклонены' },
  ];

  return (
    <RoleScreen role="customer" section="requests" title="Запросы цены">
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.md,
          flexGrow: 1,
        }}
      >
        {/* Фильтр-статус: строки-кнопки 48. */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {tabs.map((t) => (
            <Pressable
              key={t.key}
              accessibilityRole="button"
              accessibilityLabel={`Фильтр: ${t.label}`}
              onPress={() => setTab(t.key)}
              style={{
                minHeight: 48,
                justifyContent: 'center',
                paddingHorizontal: spacing.md,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: tab === t.key ? colors.primary : colors.border,
                backgroundColor:
                  tab === t.key ? colors.primarySoft : colors.surface,
              }}
            >
              <Text
                variant="bodySmall"
                color={tab === t.key ? 'primaryText' : 'text'}
              >
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {requestsQuery.isError ? (
          <ErrorState
            title="Запросы не загрузились"
            description="Проверьте соединение и попробуйте снова"
            onRetry={() => void requestsQuery.refetch()}
          />
        ) : requestsQuery.isPending ? (
          <>
            <Skeleton height={120} />
            <Skeleton height={120} />
          </>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ChevronRight}
            title="Запросов пока нет"
            description="У товаров с пометкой «Цена по запросу» попросите персональную цену — ответ действует 72 часа."
          />
        ) : (
          filtered.map((request) => (
            <RequestRow key={request.id} request={request} />
          ))
        )}
      </ScrollView>
    </RoleScreen>
  );
}
