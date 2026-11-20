/**
 * Позиция на рынке — экран продавца (Промт 17, Часть B).
 *
 * Два числовых поля: «Ряд на рынке» (1..4) и «Место» (1..40),
 * hint «Заполните — покупатели увидят вас в маршрутах по рынку».
 * Сохранение — PUT /api/market/position (организация целиком),
 * снятие позиции — DELETE. Валидация границ до запроса.
 */
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, MapPin } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Skeleton, Text, useTheme, useToast } from '@bazar/ui';
import type { MarketPosition } from '@bazar/types';
import {
  clearMarketPosition,
  fetchMarketPosition,
  saveMarketPosition,
} from '../../services/api/marketApi';

const ROWS = 4;
const SPOTS = 40;

export default function MarketPositionScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { show } = useToast();
  const client = useQueryClient();

  const positionQuery = useQuery<{ position: MarketPosition | null }>({
    queryKey: ['market-position'],
    queryFn: () => fetchMarketPosition().then((position) => ({ position })),
  });

  // Инициализация формы из ответа — установкой состояния при
  // рендере (паттерн «adjust state during render», не effect):
  // до загрузки форма не готова, после — значения фиксируются
  // один раз и дальше живут своей жизнью до снятия позиции.
  const [form, setForm] = useState<{ row: string; spot: string } | null>(null);
  const position = positionQuery.data?.position ?? null;
  if (!positionQuery.isPending && form === null) {
    setForm({
      row: position ? String(position.marketRow) : '',
      spot: position ? String(position.marketSpot) : '',
    });
  }
  const row = form?.row ?? '';
  const spot = form?.spot ?? '';
  const setRow = (value: string) =>
    setForm((prev) => ({ row: value, spot: prev?.spot ?? '' }));
  const setSpot = (value: string) =>
    setForm((prev) => ({ row: prev?.row ?? '', spot: value }));

  const invalidate = () => {
    void client.invalidateQueries({ queryKey: ['market-position'] });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      saveMarketPosition({
        marketRow: Number(row),
        marketSpot: Number(spot),
      }),
    onSuccess: () => {
      invalidate();
      show({ variant: 'success', message: 'Позиция на рынке сохранена' });
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => clearMarketPosition(),
    onSuccess: () => {
      invalidate();
      setForm({ row: '', spot: '' });
      show({ variant: 'success', message: 'Позиция снята с рынка' });
    },
  });

  const rowNum = Number(row);
  const spotNum = Number(spot);
  const valid =
    row.trim() !== '' &&
    spot.trim() !== '' &&
    Number.isInteger(rowNum) &&
    Number.isInteger(spotNum) &&
    rowNum >= 1 &&
    rowNum <= ROWS &&
    spotNum >= 1 &&
    spotNum <= SPOTS;

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
        Точка на рынке
      </Text>
    </View>
  );

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

        {positionQuery.isPending ? (
          <View style={{ gap: spacing.md }}>
            <Skeleton height={72} />
            <Skeleton height={72} />
          </View>
        ) : (
          <>
            <Text variant="body" color="textSecondary">
              Заполните — покупатели увидят вас в маршрутах по рынку
            </Text>
            <Input
              label="Ряд на рынке"
              value={row}
              onChangeText={setRow}
              placeholder={`от 1 до ${ROWS}`}
              keyboardType="number-pad"
              testID="market-position-row"
            />
            <Input
              label="Место"
              value={spot}
              onChangeText={setSpot}
              placeholder={`от 1 до ${SPOTS}`}
              keyboardType="number-pad"
              testID="market-position-spot"
            />
            {!valid && row.trim() !== '' && spot.trim() !== '' ? (
              <Text variant="caption" color="accentText">
                {`Ряд — целое от 1 до ${ROWS}, место — целое от 1 до ${SPOTS}`}
              </Text>
            ) : null}
            <Button
              variant="primary"
              size="lg"
              disabled={!valid || saveMutation.isPending}
              loading={saveMutation.isPending}
              onPress={() => saveMutation.mutate()}
              testID="market-position-save"
            >
              Сохранить
            </Button>
            {positionQuery.data?.position ? (
              <Button
                variant="ghost"
                size="lg"
                disabled={clearMutation.isPending}
                loading={clearMutation.isPending}
                onPress={() => clearMutation.mutate()}
                icon={MapPin}
                testID="market-position-clear"
              >
                Снять с рынка
              </Button>
            ) : null}
            {position ? (
              <Text variant="caption" color="textMuted">
                {`Сейчас: ряд ${position.marketRow}, место ${position.marketSpot} (${position.name})`}
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
