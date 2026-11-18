/**
 * Склады организации (Промт 11b, §2.5).
 *
 * Список складов: имя, тип, адрес, бейдж «Основной». Тап — шит
 * редактирования (имя, тип, адрес, «основной»), отдельная кнопка
 * удаления — сервер откажет, если по складу есть движения.
 * FAB «+» — создание нового склада.
 */
import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { Plus, Warehouse } from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  FilterChip,
  Input,
  Skeleton,
  Text,
  useTheme,
  useToast,
} from '@bazar/ui';
import {
  AuthError,
  STOCK_LOCATION_TYPE_LABELS,
  type StockLocation,
  type StockLocationType,
} from '@bazar/types';
import { RoleScreen } from '../../../../components/shell/RoleScreen';
import {
  useCreateStockLocation,
  useDeleteStockLocation,
  useStockLocations,
  useUpdateStockLocation,
} from '../../../../hooks/useStock';

const LOCATION_TYPES: StockLocationType[] = ['WAREHOUSE', 'STORE', 'OTHER'];

/** Черновик формы склада. */
interface LocationDraft {
  name: string;
  type: StockLocationType;
  address: string;
  isDefault: boolean;
}

const EMPTY_DRAFT: LocationDraft = {
  name: '',
  type: 'WAREHOUSE',
  address: '',
  isDefault: false,
};

export default function StockLocationsScreen() {
  const { colors, spacing, isDark } = useTheme();
  const toast = useToast();

  const locationsQuery = useStockLocations();
  const createMutation = useCreateStockLocation();
  const updateMutation = useUpdateStockLocation();
  const deleteMutation = useDeleteStockLocation();

  const [dialogOpen, setDialogOpen] = useState(false);
  /** null — создание, иначе редактирование склада. */
  const [editing, setEditing] = useState<StockLocation | null>(null);
  const [draft, setDraft] = useState<LocationDraft>(EMPTY_DRAFT);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [touched, setTouched] = useState(false);

  const locations = locationsQuery.data ?? [];

  const nameError =
    touched && draft.name.trim().length < 2
      ? 'Название — минимум 2 символа'
      : null;

  const valid = draft.name.trim().length >= 2;

  const openCreate = () => {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setTouched(false);
    setConfirmDelete(false);
    setDialogOpen(true);
  };

  const openEdit = (location: StockLocation) => {
    setEditing(location);
    setDraft({
      name: location.name,
      type: location.type,
      address: location.address ?? '',
      isDefault: location.isDefault,
    });
    setTouched(false);
    setConfirmDelete(false);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setConfirmDelete(false);
  };

  const onSave = () => {
    setTouched(true);
    if (!valid) {
      return;
    }
    const input = {
      name: draft.name.trim(),
      type: draft.type,
      address: draft.address.trim() || undefined,
      isDefault: draft.isDefault,
    };
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, input },
        {
          onSuccess: () => {
            toast.show({ variant: 'success', message: 'Склад обновлён' });
            closeDialog();
          },
          onError: () => {
            toast.show({
              variant: 'error',
              message:
                'Не удалось сохранить. Проверьте связь и попробуйте ещё раз',
            });
          },
        },
      );
    } else {
      createMutation.mutate(input, {
        onSuccess: () => {
          toast.show({ variant: 'success', message: 'Склад создан' });
          closeDialog();
        },
        onError: () => {
          toast.show({
            variant: 'error',
            message:
              'Не удалось создать склад. Проверьте связь и попробуйте ещё раз',
          });
        },
      });
    }
  };

  const onDelete = () => {
    if (!editing) {
      return;
    }
    deleteMutation.mutate(editing.id, {
      onSuccess: () => {
        toast.show({ variant: 'success', message: 'Склад удалён' });
        closeDialog();
      },
      onError: (error) => {
        const serverCode =
          error instanceof AuthError ? error.serverCode : undefined;
        if (serverCode === 'STOCK_LOCATION_HAS_MOVEMENTS') {
          toast.show({
            variant: 'error',
            message: 'Нельзя удалить: есть движения',
          });
        } else {
          toast.show({
            variant: 'error',
            message: 'Не удалось удалить. Проверьте связь и попробуйте ещё раз',
          });
        }
      },
    });
  };

  let content: React.ReactNode;
  if (locationsQuery.isLoading) {
    content = (
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Skeleton height={72} />
        <Skeleton height={72} />
      </View>
    );
  } else if (locationsQuery.isError) {
    content = <ErrorState onRetry={() => void locationsQuery.refetch()} />;
  } else if (locations.length === 0) {
    content = (
      <EmptyState
        icon={Warehouse}
        title="Пока нет складов"
        description="Создайте первый склад — на него будут приходовать товары."
        action={{ label: 'Создать склад', onPress: openCreate }}
      />
    );
  } else {
    content = (
      <FlatList
        data={locations}
        keyExtractor={(l) => l.id}
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.xl,
          gap: spacing.sm,
        }}
        renderItem={({ item }) => (
          <Card variant="outlined">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.name}. Редактировать`}
              onPress={() => openEdit(item)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                minHeight: 68,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                opacity: pressed ? 0.7 : 1,
              })}
              testID={`location-${item.id}`}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Text variant="bodySmall" numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.isDefault ? (
                    <Badge variant="success" size="sm">
                      Основной
                    </Badge>
                  ) : null}
                </View>
                <Text variant="caption" color="textSecondary" numberOfLines={1}>
                  {STOCK_LOCATION_TYPE_LABELS[item.type]}
                  {item.address ? ` · ${item.address}` : ''}
                </Text>
              </View>
            </Pressable>
          </Card>
        )}
      />
    );
  }

  return (
    <RoleScreen role="wholesale_seller" section="stock" title="Склады">
      <View style={{ flex: 1, width: '100%' }}>{content}</View>

      {locations.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Создать склад"
          onPress={openCreate}
          style={({ pressed }) => [
            {
              position: 'absolute',
              right: spacing.lg,
              bottom: spacing.lg,
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
              // Тёмная тема — граница вместо тени (правило проекта).
              ...(isDark
                ? { borderWidth: 1, borderColor: colors.borderStrong }
                : { elevation: 4 }),
            },
          ]}
          testID="locations-fab"
        >
          <Plus size={26} color={colors.onPrimary} />
        </Pressable>
      ) : null}

      <Dialog
        visible={dialogOpen}
        onClose={closeDialog}
        title={editing ? 'Редактировать склад' : 'Новый склад'}
      >
        <View style={{ gap: spacing.md }}>
          <Input
            label="Название"
            value={draft.name}
            onChangeText={(text) => setDraft((d) => ({ ...d, name: text }))}
            error={nameError}
            testID="location-name"
          />
          <View style={{ gap: spacing.sm }}>
            <Text variant="bodySmall" color="textSecondary">
              Тип
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {LOCATION_TYPES.map((type) => (
                <FilterChip
                  key={type}
                  label={STOCK_LOCATION_TYPE_LABELS[type]}
                  active={draft.type === type}
                  onPress={() => setDraft((d) => ({ ...d, type }))}
                  testID={`location-type-${type}`}
                />
              ))}
            </View>
          </View>
          <Input
            label="Адрес (необязательно)"
            value={draft.address}
            onChangeText={(text) => setDraft((d) => ({ ...d, address: text }))}
            placeholder="ул. Пример, 1"
            testID="location-address"
          />
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Основной склад"
            accessibilityState={{ checked: draft.isDefault }}
            onPress={() => setDraft((d) => ({ ...d, isDefault: !d.isDefault }))}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 48,
            }}
            testID="location-default"
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodySmall">Основной склад</Text>
              <Text variant="caption" color="textSecondary">
                Для движений по умолчанию
              </Text>
            </View>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: draft.isDefault
                  ? colors.primary
                  : colors.borderStrong,
                backgroundColor: draft.isDefault
                  ? colors.primary
                  : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {draft.isDefault ? (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.onPrimary,
                  }}
                />
              ) : null}
            </View>
          </Pressable>

          <Button
            onPress={onSave}
            disabled={
              !valid || updateMutation.isPending || createMutation.isPending
            }
            testID="location-save"
          >
            {editing ? 'Сохранить' : 'Создать'}
          </Button>

          {editing && !editing.isDefault ? (
            confirmDelete ? (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Button
                    variant="secondary"
                    onPress={() => setConfirmDelete(false)}
                  >
                    Отмена
                  </Button>
                </View>
                <View style={{ flex: 1 }}>
                  <Button onPress={onDelete} loading={deleteMutation.isPending}>
                    Удалить
                  </Button>
                </View>
              </View>
            ) : (
              <Button
                variant="ghost"
                onPress={() => setConfirmDelete(true)}
                testID="location-delete"
              >
                Удалить склад
              </Button>
            )
          ) : null}
        </View>
      </Dialog>
    </RoleScreen>
  );
}
