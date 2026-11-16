/**
 * Форма движения: приход / списание / корректировка (Промт 11b).
 *
 * Склад, количество (QuantitySelector + ввод), причина (≥3
 * символов; для списания — быстрые варианты «порча», «потеря»,
 * «инвентаризация»). Корректировка вводит новый остаток — дельту
 * считает система, минус допустим (недостача). Кнопка «Сохранить»
 * активна только на валидной форме; после — toast и возврат.
 */
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Button,
  Card,
  ErrorState,
  FilterChip,
  Input,
  LocationSelector,
  QuantitySelector,
  Skeleton,
  Text,
  useTheme,
  useToast,
} from '@bazar/ui';
import { AuthError } from '@bazar/types';
import { RoleScreen } from '../../../../../components/shell/RoleScreen';
import { useSellerOffer } from '../../../../../hooks/useSeller';
import {
  useCreateStockMovement,
  useStockBalances,
  useStockLocations,
} from '../../../../../hooks/useStock';

type MovementKind = 'RECEIPT' | 'WRITE_OFF' | 'ADJUSTMENT';

const KIND_TITLES: Record<MovementKind, string> = {
  RECEIPT: 'Приход',
  WRITE_OFF: 'Списание',
  ADJUSTMENT: 'Корректировка остатка',
};

const WRITE_OFF_REASONS = ['порча', 'потеря', 'инвентаризация'];

/** Разбор количества: целое число или null. */
function parseIntStrict(value: string): number | null {
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export default function StockMovementFormScreen() {
  const router = useRouter();
  const { id, type } = useLocalSearchParams<{ id: string; type: string }>();
  const { colors, spacing } = useTheme();
  const toast = useToast();

  const kind: MovementKind =
    type === 'WRITE_OFF' || type === 'ADJUSTMENT' ? type : 'RECEIPT';

  const offerQuery = useSellerOffer(id);
  const balancesQuery = useStockBalances({ offerId: id });
  const locationsQuery = useStockLocations();
  const mutation = useCreateStockMovement();

  const locations = useMemo(
    () => locationsQuery.data ?? [],
    [locationsQuery.data],
  );
  const defaultLocationId = useMemo(
    () => locations.find((l) => l.isDefault)?.id ?? locations[0]?.id ?? null,
    [locations],
  );

  const [locationId, setLocationId] = useState<string | null>(null);
  const [quantityText, setQuantityText] = useState('');
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  const effectiveLocationId = locationId ?? defaultLocationId;
  const offer = offerQuery.data;
  const unit = offer?.product.unit ?? '';
  const currentAvailable =
    balancesQuery.data?.items.find((b) => b.locationId === effectiveLocationId)
      ?.availableQty ?? 0;

  const quantity = parseIntStrict(quantityText);

  /** Корректировка: дельта «новое − текущее» (может быть отрицательной). */
  const adjustmentDelta =
    kind === 'ADJUSTMENT' && quantity !== null
      ? quantity - currentAvailable
      : null;
  /** Дельта к отправке (приход/списание — само количество). */
  const delta = kind === 'ADJUSTMENT' ? adjustmentDelta : quantity;

  const quantityError =
    touched && quantity === null && quantityText !== ''
      ? 'Введите целое число'
      : quantity !== null && kind === 'RECEIPT' && quantity <= 0
        ? 'Количество должно быть больше нуля'
        : quantity !== null && kind === 'WRITE_OFF' && quantity <= 0
          ? 'Количество должно быть больше нуля'
          : quantity !== null &&
              kind === 'WRITE_OFF' &&
              quantity > currentAvailable
            ? `Недоступно: на складе только ${currentAvailable}${unit ? ` ${unit}` : ''}`
            : quantity !== null &&
                kind === 'ADJUSTMENT' &&
                adjustmentDelta === 0
              ? 'Новый остаток совпадает с текущим'
              : null;

  const reasonError =
    touched && reason.trim().length < 3
      ? 'Укажите причину (минимум 3 символа)'
      : null;

  const valid =
    quantity !== null &&
    delta !== null &&
    delta !== 0 &&
    quantityError === null &&
    reason.trim().length >= 3;

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

  const onSave = () => {
    setTouched(true);
    if (!valid || delta === null) {
      return;
    }
    mutation.mutate(
      {
        offerId: id,
        locationId: effectiveLocationId ?? undefined,
        type: kind,
        quantity: delta,
        reason: reason.trim(),
      },
      {
        onSuccess: (result) => {
          const headline =
            kind === 'RECEIPT'
              ? `Приход оформлен: ${delta} ${unit} ${offer.product.name}`.trim()
              : kind === 'WRITE_OFF'
                ? `Списано: ${delta} ${unit} ${offer.product.name}`.trim()
                : `Остаток скорректирован: ${delta > 0 ? '+' : '−'}${Math.abs(delta)} ${unit}`.trim();
          toast.show({
            variant: 'success',
            message: headline,
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
                ? 'Недостаточно доступного остатка — обновите экран и проверьте резерв'
                : 'Не удалось сохранить. Проверьте связь и попробуйте ещё раз',
          });
        },
      },
    );
  };

  return (
    <RoleScreen
      role="wholesale_seller"
      section="stock"
      title={`${KIND_TITLES[kind]} · ${offer.product.name}`}
    >
      <View style={{ flex: 1, width: '100%' }}>
        <ScrollView
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: spacing.xl,
            gap: spacing.md,
          }}
        >
          <Card style={{ padding: spacing.md, gap: spacing.sm }}>
            <LocationSelector
              locations={locations.map((l) => ({
                id: l.id,
                name: l.name,
                address: l.address ?? undefined,
              }))}
              value={effectiveLocationId}
              onChange={setLocationId}
              label="Склад"
              allowAll={false}
              disabled={locationsQuery.isLoading}
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="caption" color="textSecondary">
                  Доступно сейчас
                </Text>
                <Text variant="bodyStrong" mono>
                  {`${currentAvailable}${unit ? ` ${unit}` : ''}`}
                </Text>
              </View>
              {kind === 'ADJUSTMENT' && adjustmentDelta !== null ? (
                <View style={{ flex: 1, gap: 2, alignItems: 'flex-end' }}>
                  <Text variant="caption" color="textSecondary">
                    Дельта
                  </Text>
                  <Text
                    variant="bodyStrong"
                    mono
                    style={{
                      color:
                        adjustmentDelta > 0
                          ? colors.success
                          : adjustmentDelta < 0
                            ? colors.danger
                            : colors.text,
                    }}
                  >
                    {adjustmentDelta > 0
                      ? `+${adjustmentDelta}`
                      : adjustmentDelta < 0
                        ? `−${Math.abs(adjustmentDelta)}`
                        : '0'}
                  </Text>
                </View>
              ) : null}
            </View>
          </Card>

          {kind === 'ADJUSTMENT' ? (
            <Input
              label={`Новый остаток (доступно), ${unit || 'ед.'}`}
              value={quantityText}
              onChangeText={setQuantityText}
              keyboardType="numeric"
              error={quantityError}
              hint={`Текущий: ${currentAvailable}${unit ? ` ${unit}` : ''}. Система посчитает дельту — минус допустим (недостача)`}
              testID="movement-quantity"
            />
          ) : (
            <View style={{ gap: spacing.sm }}>
              <Text variant="bodySmall" color="textSecondary">
                {`Количество, ${unit || 'ед.'}`}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                }}
              >
                <QuantitySelector
                  value={quantity !== null && quantity >= 0 ? quantity : 0}
                  onChange={(value) => setQuantityText(String(value))}
                  min={0}
                  max={
                    kind === 'WRITE_OFF' ? Math.max(currentAvailable, 0) : 999
                  }
                />
                <View style={{ flex: 1 }}>
                  <Input
                    value={quantityText}
                    onChangeText={setQuantityText}
                    keyboardType="numeric"
                    error={quantityError}
                    testID="movement-quantity"
                  />
                </View>
              </View>
            </View>
          )}

          {kind === 'WRITE_OFF' ? (
            <View style={{ gap: spacing.sm }}>
              <Input
                label="Причина списания"
                value={reason}
                onChangeText={setReason}
                multiline
                placeholder="порча при перевозке, потеря на точке…"
                error={reasonError}
                testID="movement-reason"
              />
              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing.sm,
                  flexWrap: 'wrap',
                }}
              >
                {WRITE_OFF_REASONS.map((quick) => (
                  <FilterChip
                    key={quick}
                    label={quick}
                    active={reason.trim() === quick}
                    onPress={() => setReason(quick)}
                    testID={`writeoff-reason-${quick}`}
                  />
                ))}
              </View>
            </View>
          ) : (
            <Input
              label="Причина"
              value={reason}
              onChangeText={setReason}
              multiline
              placeholder={
                kind === 'RECEIPT'
                  ? 'закупка у фермера, возврат с точки…'
                  : 'сверка с фактом, инвентаризация…'
              }
              error={reasonError}
              hint="Запись в журнал движений"
              testID="movement-reason"
            />
          )}

          <Button
            onPress={onSave}
            disabled={!valid || mutation.isPending}
            testID="movement-save"
          >
            {mutation.isPending ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </ScrollView>
      </View>
    </RoleScreen>
  );
}
