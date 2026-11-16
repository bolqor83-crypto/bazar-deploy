/**
 * Форма движения: приход / списание / корректировка (Промт 11b;
 * редизайн Промта 12, Часть A).
 *
 * Полноэкранная форма: сверху — чипы выбора типа (переключение без
 * возврата), склад, количество (QuantitySelector + ввод), причина
 * (multiline, 3 строки; для списания — быстрые «порча»/«потеря»/
 * «инвентаризация»). Корректировка вводит новый остаток — дельту
 * считает система, минус допустим (недостача). Кнопка «Сохранить» —
 * sticky внизу, primary lg; активна только на валидной форме.
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
  Skeleton,
  Text,
  useTheme,
  useToast,
} from '@bazar/ui';
import { AuthError } from '@bazar/types';
import { RoleScreen } from '../../../../../components/shell/RoleScreen';
import { QuantityField } from '../../../../../components/stock/QuantityField';
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

/** Чипы выбора типа (Промт 12: переключение без возврата). */
const KIND_CHIPS: {
  key: MovementKind | 'TRANSFER';
  label: string;
  testID: string;
}[] = [
  { key: 'RECEIPT', label: 'Приход', testID: 'movement-kind-receipt' },
  { key: 'WRITE_OFF', label: 'Списание', testID: 'movement-kind-writeoff' },
  {
    key: 'ADJUSTMENT',
    label: 'Корректировка',
    testID: 'movement-kind-adjustment',
  },
  { key: 'TRANSFER', label: 'Перемещение', testID: 'movement-kind-transfer' },
];

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
  const params = useLocalSearchParams<{ id: string; type: string }>();
  /** Прямой URL: params гидратируются не сразу. */
  const id = typeof params.id === 'string' ? params.id : '';
  const type = typeof params.type === 'string' ? params.type : '';
  const { colors, spacing } = useTheme();
  const toast = useToast();

  const initialKind: MovementKind =
    type === 'WRITE_OFF' || type === 'ADJUSTMENT' ? type : 'RECEIPT';
  const [kind, setKind] = useState<MovementKind>(initialKind);

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

  /** Чип типа: перемещение — отдельная форма, остальные — локально. */
  const onKindChip = (key: MovementKind | 'TRANSFER') => {
    if (key === 'TRANSFER') {
      router.replace(`/wholesale/stock/${id}/transfer`);
      return;
    }
    setKind(key);
  };

  return (
    <RoleScreen
      role="wholesale_seller"
      section="stock"
      title={KIND_TITLES[kind]}
    >
      <View style={{ flex: 1, width: '100%' }}>
        <ScrollView
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: spacing.xl,
            gap: spacing.md,
          }}
        >
          {/* Выбор типа движения — 4 чипа в ряд. */}
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              flexWrap: 'wrap',
            }}
          >
            {KIND_CHIPS.map((chip) => (
              <FilterChip
                key={chip.key}
                label={chip.label}
                size="sm"
                active={chip.key === kind}
                onPress={() => onKindChip(chip.key)}
                testID={chip.testID}
              />
            ))}
          </View>

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
            <View style={{ gap: spacing.xs }}>
              <Input
                label={`Новый остаток (доступно), ${unit || 'ед.'}`}
                value={quantityText}
                onChangeText={setQuantityText}
                keyboardType="numeric"
                error={quantityError}
                hint={`Текущий: ${currentAvailable}${unit ? ` ${unit}` : ''}. Система посчитает дельту — минус допустим (недостача)`}
                testID="movement-quantity"
              />
              {quantity !== null &&
              adjustmentDelta !== null &&
              adjustmentDelta !== 0 ? (
                <Text variant="bodySmall" mono>
                  {`После сохранения доступно: ${quantity}${unit ? ` ${unit}` : ''}`}
                </Text>
              ) : null}
            </View>
          ) : (
            <View style={{ gap: spacing.xs }}>
              <Text variant="bodySmall" color="textSecondary">
                {`Количество, ${unit || 'ед.'}`}
              </Text>
              <QuantityField
                value={quantityText}
                onChangeText={setQuantityText}
                unit={unit}
                max={
                  kind === 'WRITE_OFF' ? Math.max(currentAvailable, 0) : null
                }
                testID="movement-quantity"
              />
              {quantityError ? (
                <Text variant="caption" style={{ color: colors.danger }}>
                  {quantityError}
                </Text>
              ) : (
                <Text variant="caption" color="textMuted">
                  {kind === 'WRITE_OFF'
                    ? `Максимум: ${currentAvailable}${unit ? ` ${unit}` : ''} — доступный остаток`
                    : 'Приход увеличит доступный остаток на эту величину'}
                </Text>
              )}
              {quantity !== null && delta !== null && delta !== 0 ? (
                <Text variant="bodySmall" mono>
                  {kind === 'WRITE_OFF'
                    ? `После списания доступно: ${Math.max(currentAvailable - quantity, 0)}${unit ? ` ${unit}` : ''}`
                    : `После прихода доступно: ${currentAvailable + quantity}${unit ? ` ${unit}` : ''}`}
                </Text>
              ) : null}
            </View>
          )}

          {kind === 'WRITE_OFF' ? (
            <View style={{ gap: spacing.sm }}>
              <Input
                label="Причина списания"
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={3}
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
              numberOfLines={3}
              placeholder={
                kind === 'RECEIPT'
                  ? 'закупка у фермера, возврат с точки…'
                  : 'сверка с фактом, инвентаризация…'
              }
              error={reasonError}
              hint="Причина сохранится в журнал движений — её увидит команда"
              testID="movement-reason"
            />
          )}
        </ScrollView>

        {/* Кнопка закреплена внизу формы — всегда в thumb zone. */}
        <View
          style={{
            paddingHorizontal: spacing.md,
            paddingTop: spacing.sm,
            paddingBottom: spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
            gap: spacing.xs,
          }}
        >
          <Button
            size="lg"
            onPress={onSave}
            disabled={!valid || mutation.isPending}
            fullWidth
            testID="movement-save"
          >
            {mutation.isPending ? 'Сохраняем…' : 'Сохранить'}
          </Button>
          {!valid ? (
            <Text
              variant="caption"
              color="textMuted"
              style={{ textAlign: 'center' }}
            >
              Укажите количество и причину — кнопка активируется
            </Text>
          ) : null}
        </View>
      </View>
    </RoleScreen>
  );
}
