/**
 * Форма перемещения между складами (Промт 11b).
 *
 * С какого склада, на какой (не тот же), количество в пределах
 * доступного на складе-источнике, причина. Остатки обоих складов
 * показаны крупно; после сохранения — toast и возврат в журнал.
 * Количество предзаполнено минимальной партией, кнопка — в потоке
 * формы (доработка по VLM-аудиту Промта 12).
 */
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Button,
  Card,
  ErrorState,
  Input,
  LocationSelector,
  Skeleton,
  Text,
  formatQuantity,
  useTheme,
  useToast,
} from '@bazar/ui';
import { AuthError } from '@bazar/types';
import { RoleScreen } from '../../../../../components/shell/RoleScreen';
import { QuantityField } from '../../../../../components/stock/QuantityField';
import { useSellerOffer } from '../../../../../hooks/useSeller';
import {
  useStockBalances,
  useStockLocations,
  useTransferStock,
} from '../../../../../hooks/useStock';

/** Разбор количества: целое > 0 или null. */
function parsePositiveInt(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function StockTransferFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  /** Прямой URL: params гидратируются не сразу. */
  const id = typeof params.id === 'string' ? params.id : '';
  const { colors, spacing } = useTheme();
  const toast = useToast();

  const offerQuery = useSellerOffer(id);
  const balancesQuery = useStockBalances({ offerId: id });
  const locationsQuery = useStockLocations();
  const mutation = useTransferStock();

  const locations = useMemo(
    () => locationsQuery.data ?? [],
    [locationsQuery.data],
  );
  const defaultLocationId = useMemo(
    () => locations.find((l) => l.isDefault)?.id ?? locations[0]?.id ?? null,
    [locations],
  );
  const otherLocationId = useMemo(
    () => locations.find((l) => l.id !== defaultLocationId)?.id ?? null,
    [locations, defaultLocationId],
  );

  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  /** null — ещё не трогали: показывается предзаполнение. */
  const [quantityInput, setQuantityInput] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  const effectiveFrom = fromId ?? defaultLocationId;
  const effectiveTo = toId ?? otherLocationId;

  const offer = offerQuery.data;
  const unit = offer?.product.unit ?? '';

  const balanceAt = (locationId: string | null) =>
    locationId === null
      ? 0
      : (balancesQuery.data?.items.find((b) => b.locationId === locationId)
          ?.availableQty ?? 0);

  const availableFrom = balanceAt(effectiveFrom);
  const availableTo = balanceAt(effectiveTo);

  // Предзаполнение минимальной партией в пределах доступного на
  // источнике: герой-число видно сразу (VLM-аудит доработки).
  // Вычисляется на рендере — без эффекта.
  const prefillQuantity =
    offer && availableFrom > 0
      ? String(Math.min(Math.max(1, offer.minQuantity), availableFrom))
      : '';
  const quantityText = quantityInput ?? prefillQuantity;
  const setQuantityText = setQuantityInput;
  const quantity = parsePositiveInt(quantityText);

  const sameLocation = effectiveFrom !== null && effectiveFrom === effectiveTo;

  const quantityError =
    touched && quantityText !== '' && quantity === null
      ? 'Введите целое число больше нуля'
      : quantity !== null && quantity > availableFrom
        ? `Недоступно: на складе-источнике только ${formatQuantity(availableFrom, unit)}`
        : null;

  const reasonError =
    touched && reason.trim().length < 3
      ? 'Укажите причину (минимум 3 символа)'
      : null;

  const sameError =
    touched && sameLocation ? 'Склады должны различаться' : null;

  const valid =
    quantity !== null &&
    quantity <= availableFrom &&
    quantityError === null &&
    reason.trim().length >= 3 &&
    !sameLocation &&
    effectiveFrom !== null &&
    effectiveTo !== null;

  if (offerQuery.isLoading) {
    return (
      <RoleScreen role="wholesale_seller" section="stock" title="Склад">
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <Skeleton height={72} />
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
          onRetry={() => router.replace('/wholesale/stock')}
        />
      </RoleScreen>
    );
  }

  if (locations.length < 2) {
    return (
      <RoleScreen role="wholesale_seller" section="stock" title="Перемещение">
        <Card style={{ padding: spacing.md }}>
          <Text variant="bodySmall" color="textSecondary">
            Для перемещения нужно минимум два склада. Создайте второй склад на
            экране «Склады», затем вернитесь к перемещению.
          </Text>
        </Card>
      </RoleScreen>
    );
  }

  const onSave = () => {
    setTouched(true);
    if (!valid || effectiveFrom === null || effectiveTo === null) {
      return;
    }
    mutation.mutate(
      {
        offerId: id,
        fromLocationId: effectiveFrom,
        toLocationId: effectiveTo,
        quantity,
        reason: reason.trim(),
      },
      {
        onSuccess: () => {
          const fromName =
            locations.find((l) => l.id === effectiveFrom)?.name ?? 'склад';
          const toName =
            locations.find((l) => l.id === effectiveTo)?.name ?? 'склад';
          toast.show({
            variant: 'success',
            message:
              `Перемещено ${quantity} ${unit}: ${fromName} → ${toName}`.trim(),
          });
          router.back();
        },
        onError: (error) => {
          const serverCode =
            error instanceof AuthError ? error.serverCode : undefined;
          toast.show({
            variant: 'error',
            message:
              serverCode === 'STOCK_OUT_OF_STOCK'
                ? 'Недостаточно остатка на складе-источнике — обновите экран'
                : 'Не удалось переместить. Проверьте связь и попробуйте ещё раз',
          });
        },
      },
    );
  };

  return (
    <RoleScreen role="wholesale_seller" section="stock" title="Перемещение">
      <View style={{ flex: 1, width: '100%' }}>
        <ScrollView
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: spacing.xxl,
            gap: spacing.md,
          }}
        >
          <Card style={{ padding: spacing.md, gap: spacing.sm }}>
            <View style={{ gap: 2, paddingBottom: spacing.xs }}>
              <Text variant="caption" color="textSecondary">
                Позиция
              </Text>
              <Text variant="bodyStrong" numberOfLines={2}>
                {offer.product.name}
              </Text>
            </View>
            <LocationSelector
              locations={locations.map((l) => ({
                id: l.id,
                name: l.name,
                address: l.address ?? undefined,
              }))}
              value={effectiveFrom}
              onChange={setFromId}
              label="С какого склада"
              showLabel
              allowAll={false}
            />
            <View style={{ gap: 2 }}>
              <Text variant="caption" color="textSecondary">
                Доступно на складе-источнике
              </Text>
              {/* numberL: ключевые цифры формы — крупный табличный
                  акцент (VLM-аудит: «0/120 кг могли бы быть выделены»). */}
              <Text variant="numberL" mono style={{ color: colors.text }}>
                {formatQuantity(availableFrom, unit)}
              </Text>
            </View>
          </Card>

          <Card style={{ padding: spacing.md, gap: spacing.sm }}>
            <LocationSelector
              locations={locations.map((l) => ({
                id: l.id,
                name: l.name,
                address: l.address ?? undefined,
              }))}
              value={effectiveTo}
              onChange={setToId}
              label="На какой склад"
              showLabel
              allowAll={false}
            />
            <View style={{ gap: 2 }}>
              <Text variant="caption" color="textSecondary">
                Доступно на складе-получателе
              </Text>
              <Text variant="numberL" mono style={{ color: colors.text }}>
                {formatQuantity(availableTo, unit)}
              </Text>
            </View>
            {sameError ? (
              <Text variant="caption" style={{ color: colors.danger }}>
                {sameError}
              </Text>
            ) : null}
          </Card>

          <View style={{ gap: spacing.xs }}>
            <Text variant="bodySmall" color="textSecondary">
              {`Количество, ${unit || 'ед.'}`}
            </Text>
            <QuantityField
              value={quantityText}
              onChangeText={setQuantityText}
              unit={unit}
              max={Math.max(availableFrom, 0)}
              testID="transfer-quantity"
            />
            {quantityError ? (
              <Text variant="caption" style={{ color: colors.danger }}>
                {quantityError}
              </Text>
            ) : (
              <Text variant="caption" color="textMuted">
                {`Максимум: ${formatQuantity(availableFrom, unit)} — остаток склада-источника`}
              </Text>
            )}
            {quantity !== null && quantity > 0 && quantity <= availableFrom ? (
              <Text variant="bodySmall" mono>
                {`После перемещения: ${formatQuantity(availableFrom - quantity, unit)} → ${formatQuantity(availableTo + quantity, unit)}`}
              </Text>
            ) : null}
          </View>

          <Input
            label="Причина"
            value={reason}
            onChangeText={setReason}
            multiline
            placeholder="развоз по точкам, передача на реализацию…"
            error={reasonError}
            hint="Запись в журнал движений обоих складов"
            testID="transfer-reason"
          />
        </ScrollView>

        {/* Кнопка-футер вне скролла: всегда видна целиком (VLM-аудит
            итерации 4: «кнопка подтверждения обрезана внизу»). */}
        <View
          style={{
            padding: spacing.md,
            paddingTop: spacing.sm,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
            gap: spacing.xs,
          }}
        >
          <Button
            onPress={onSave}
            disabled={!valid || mutation.isPending}
            fullWidth
            testID="transfer-save"
          >
            {mutation.isPending ? 'Перемещаем…' : 'Переместить'}
          </Button>
          {!valid ? (
            <Text
              variant="caption"
              color="textSecondary"
              style={{ textAlign: 'center' }}
            >
              Укажите причину — кнопка активируется
            </Text>
          ) : null}
        </View>
      </View>
    </RoleScreen>
  );
}
