/**
 * Редактирование предложения (Промт 10, Часть B).
 *
 * Цена/склад/мин. партия с журналом: смена цены пишет историю,
 * смена склада требует причины. Скрытый блок «История цены»
 * раскрывается одним тапом. Архивирование — с подтверждением.
 */
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, ChevronUp, History } from 'lucide-react-native';
import {
  Button,
  Card,
  Dialog,
  ErrorState,
  Input,
  Skeleton,
  Text,
  useTheme,
  useToast,
} from '@bazar/ui';
import { RoleScreen } from '../../../../components/shell/RoleScreen';
import {
  useArchiveSellerProduct,
  useDeleteSellerOffer,
  useSellerOffer,
  useUpdateSellerOffer,
} from '../../../../hooks/useSeller';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SellerOfferEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
  const toast = useToast();

  const offerQuery = useSellerOffer(id);
  const updateMutation = useUpdateSellerOffer();
  const deleteMutation = useDeleteSellerOffer();
  void useArchiveSellerProduct;

  const [stockReason, setStockReason] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  /** Правки поверх данных сервера: пусто — значения из оффера. */
  const [edits, setEdits] = useState<{
    price?: string;
    stock?: string;
    minQuantity?: string;
  }>({});

  const offer = offerQuery.data;

  if (offerQuery.isLoading) {
    return (
      <RoleScreen role="wholesale_seller" section="offers" title="Предложение">
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <Skeleton height={72} />
          <Skeleton height={72} />
          <Skeleton height={72} />
        </View>
      </RoleScreen>
    );
  }

  if (offerQuery.isError || !offer) {
    return (
      <RoleScreen role="wholesale_seller" section="offers" title="Предложение">
        <ErrorState
          title="Предложение не найдено"
          description="Возможно, оно удалено."
          onRetry={() => router.replace('/wholesale/offers')}
        />
      </RoleScreen>
    );
  }

  const price = edits.price ?? (offer.price / 100).toString();
  const stock = edits.stock ?? String(offer.stock);
  const minQuantity = edits.minQuantity ?? String(offer.minQuantity);
  const priceChanged = Math.round(Number(price) * 100) !== offer.price;
  const stockChanged = Number(stock) !== offer.stock;
  const minChanged = Number(minQuantity) !== offer.minQuantity;
  const dirty = priceChanged || stockChanged || minChanged;
  const valid =
    Number(price) > 0 && Number(stock) >= 0 && Number(minQuantity) >= 1;

  const onSave = () => {
    updateMutation.mutate(
      {
        id: offer.id,
        input: {
          ...(priceChanged ? { price: Math.round(Number(price) * 100) } : {}),
          ...(stockChanged
            ? {
                stock: Number(stock),
                stockReason: stockReason.trim() || 'корректировка',
              }
            : {}),
          ...(minChanged ? { minQuantity: Number(minQuantity) } : {}),
        },
      },
      {
        onSuccess: (updated) => {
          setStockReason('');
          setEdits({});
          toast.show({
            variant: 'success',
            message: `Предложение обновлено (${(updated.price / 100).toLocaleString('ru-RU')} ₽)`,
          });
        },
        onError: () => {
          toast.show({ variant: 'error', message: 'Не удалось сохранить. Проверьте связь и попробуйте ещё раз' });
        },
      },
    );
  };

  return (
    <RoleScreen
      role="wholesale_seller"
      section="offers"
      title={offer.product.name}
    >
      <View style={{ flex: 1, width: '100%' }}>
        <ScrollView
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: spacing.xl,
            gap: spacing.md,
          }}
        >
          <Input
            label="Цена, ₽ за единицу"
            value={price}
            onChangeText={(text) => setEdits((e) => ({ ...e, price: text }))}
            keyboardType="numeric"
            hint={priceChanged ? 'Смена цены попадёт в историю' : undefined}
            testID="offer-edit-price"
          />
          <Input
            label="Склад"
            value={stock}
            onChangeText={(text) => setEdits((e) => ({ ...e, stock: text }))}
            keyboardType="numeric"
            testID="offer-edit-stock"
          />
          {stockChanged ? (
            <Input
              label="Причина изменения склада"
              value={stockReason}
              onChangeText={setStockReason}
              placeholder="инвентаризация, поставка, брак…"
              hint="Запись в журнал склада"
              testID="offer-edit-reason"
            />
          ) : null}
          <Input
            label="Минимальная партия"
            value={minQuantity}
            onChangeText={(text) =>
              setEdits((e) => ({ ...e, minQuantity: text }))
            }
            keyboardType="numeric"
            testID="offer-edit-min"
          />

          <Button
            onPress={onSave}
            disabled={!dirty || !valid || updateMutation.isPending}
            testID="offer-edit-save"
          >
            {updateMutation.isPending ? 'Сохраняем…' : 'Сохранить'}
          </Button>

          {/* История цены — свёрнута, раскрывается тапом */}
          <Card>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="История цены"
              onPress={() => setHistoryOpen((v) => !v)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: 56,
                paddingHorizontal: spacing.md,
                opacity: pressed ? 0.7 : 1,
              })}
              testID="offer-history-toggle"
            >
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <History size={18} color={colors.textSecondary} />
                <Text variant="bodySmall">
                  {`История цены (${offer.priceHistory.length})`}
                </Text>
              </View>
              {historyOpen ? (
                <ChevronUp size={18} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={18} color={colors.textSecondary} />
              )}
            </Pressable>
            {historyOpen ? (
              <View
                style={{
                  paddingHorizontal: spacing.md,
                  paddingBottom: spacing.sm,
                  gap: 6,
                }}
              >
                {offer.priceHistory.map((entry, index) => (
                  <View
                    key={`${entry.createdAt}-${index}`}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text variant="caption" color="textSecondary" mono>
                      {(entry.price / 100).toLocaleString('ru-RU')} ₽
                    </Text>
                    <Text variant="caption" color="textMuted">
                      {formatDate(entry.createdAt)}
                    </Text>
                  </View>
                ))}
                {offer.priceHistory.length === 0 ? (
                  <Text variant="caption" color="textSecondary">
                    Истории пока нет
                  </Text>
                ) : null}
              </View>
            ) : null}
          </Card>

          {offer.archivedAt ? (
            <Card>
              <Text variant="bodySmall" color="textSecondary">
                Предложение в архиве. Восстановление — Промт 11.
              </Text>
            </Card>
          ) : (
            <Button
    variant="ghost"
    onPress={() => setConfirmDelete(true)}
    testID="offer-edit-delete"
    >Удалить предложение</Button>
          )}
        </ScrollView>

        <Dialog
          visible={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          title="Удалить предложение?"
        >
          <Text variant="bodySmall" color="textSecondary">
            {`«${offer.product.name}» пропадёт из каталога. ${
              offer.stock > 0 ? 'Остаток склада обнулится.' : ''
            }Если по предложению есть заказы — оно уйдёт в архив.`}
          </Text>
          <View
            style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}
          >
            <View style={{ flex: 1 }}>
              <Button
                variant="secondary"
                onPress={() => setConfirmDelete(false)}
              >
                Отмена
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button
                onPress={() => {
                  setConfirmDelete(false);
                  deleteMutation.mutate(offer.id, {
                    onSuccess: (result) => {
                      toast.show({
                        variant: 'success',
                        message: result.archived
                          ? 'Предложение в архиве'
                          : 'Предложение удалено',
                      });
                      router.replace('/wholesale/offers');
                    },
                  });
                }}
              >
                Удалить
              </Button>
            </View>
          </View>
        </Dialog>
      </View>
    </RoleScreen>
  );
}
