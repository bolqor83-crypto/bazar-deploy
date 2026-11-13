/**
 * Редактирование товара (Промт 10, Часть B).
 *
 * Форма основных полей, список предложений товара, архивирование.
 * Смена полей — PATCH; создание предложения — из этого же экрана.
 */
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Package } from 'lucide-react-native';
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  Input,
  OfferRow,
  Skeleton,
  Text,
  useTheme,
  useToast,
} from '@bazar/ui';
import { RoleScreen } from '../../../../components/shell/RoleScreen';
import {
  useArchiveSellerProduct,
  useSellerProducts,
  useUpdateSellerProduct,
} from '../../../../hooks/useSeller';
import { fetchSellerOffers } from '../../../../services/api/sellerApi';

export default function SellerProductEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { spacing } = useTheme();
  const toast = useToast();

  const productsQuery = useSellerProducts(false);
  const archivedQuery = useSellerProducts(true);
  const updateMutation = useUpdateSellerProduct();
  const archiveMutation = useArchiveSellerProduct();

  /** Правки поверх данных сервера: пусто — значения из товара. */
  const [edits, setEdits] = useState<{
    title?: string;
    subtitle?: string;
    description?: string;
    unit?: string;
    categoryId?: string;
  }>({});
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [offers, setOffers] = useState<
    { id: string; title: string; price: number; stock: number; unit: string; badge: string | null; archivedAt: string | null }[]
  >([]);

  const product =
    productsQuery.data?.find((p) => p.id === id) ??
    archivedQuery.data?.find((p) => p.id === id);

  useEffect(() => {
    if (!id) {
      return;
    }
    // Предложения этого товара (все, включая архив).
    void fetchSellerOffers({ archived: false, pageSize: 50 })
      .then((list) => {
        const own = list.items.filter((o) => o.productId === id);
        setOffers(
          own.map((o) => ({
            id: o.id,
            title: o.product.name,
            price: o.price,
            stock: o.stock,
            unit: o.product.unit,
            badge: o.badge,
            archivedAt: o.archivedAt,
          })),
        );
      })
      .catch(() => undefined);
  }, [id]);

  if (productsQuery.isLoading) {
    return (
      <RoleScreen role="wholesale_seller" section="products" title="Товар">
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <Skeleton height={72} />
          <Skeleton height={72} />
        </View>
      </RoleScreen>
    );
  }

  if (!product) {
    return (
      <RoleScreen role="wholesale_seller" section="products" title="Товар">
        <ErrorState
          title="Товар не найден"
          description="Возможно, он удалён или принадлежит другой организации."
          onRetry={() => router.replace('/wholesale/products')}
        />
      </RoleScreen>
    );
  }

  const title = edits.title ?? product.title;
  const subtitle = edits.subtitle ?? (product.subtitle ?? '');
  const description = edits.description ?? product.description;
  const unit = edits.unit ?? product.unit;
  const categoryId = edits.categoryId ?? product.categoryId;
  const dirty =
    title !== product.title ||
    subtitle !== (product.subtitle ?? '') ||
    description !== product.description ||
    unit !== product.unit ||
    categoryId !== product.categoryId;

  const onSave = () => {
    updateMutation.mutate(
      {
        id: product.id,
        input: {
          title: title.trim(),
          subtitle: subtitle.trim(),
          description,
          unit: unit.trim(),
          categoryId,
        },
      },
      {
        onSuccess: () => {
          setEdits({});
          toast.show({ variant: 'success', message: 'Изменения сохранены' });
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
      section="products"
      title={product.title}
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
            label="Название"
            value={title}
            onChangeText={(text) => setEdits((e) => ({ ...e, title: text }))}
            testID="edit-title-input"
          />
          <Input
            label="Подзаголовок"
            value={subtitle}
            onChangeText={(text) => setEdits((e) => ({ ...e, subtitle: text }))}
            testID="edit-subtitle-input"
          />
          <Input
            label="Описание"
            value={description}
            onChangeText={(text) =>
              setEdits((e) => ({ ...e, description: text }))
            }
            multiline
            testID="edit-description-input"
          />
          <Input
            label="Единица измерения"
            value={unit}
            onChangeText={(text) => setEdits((e) => ({ ...e, unit: text }))}
            testID="edit-unit-input"
          />
          <View style={{ gap: spacing.sm }}>
            <Text variant="bodySmall" color="textSecondary">
              Категория
            </Text>
            <Text variant="body">{product.category.name}</Text>
          </View>

          <Button
            onPress={onSave}
            disabled={!dirty || updateMutation.isPending}
            testID="edit-save"
          >
            {updateMutation.isPending ? 'Сохраняем…' : 'Сохранить'}
          </Button>

          <View style={{ gap: spacing.sm, paddingTop: spacing.md }}>
            <Text variant="h3">Предложения</Text>
            {offers.length === 0 ? (
              <Card>
                <EmptyState
                  icon={Package}
                  title="Предложений нет"
                  description="Создайте первую партию на экране предложений."
                  action={{
                    label: 'К предложениям',
                    onPress: () => router.push('/wholesale/offers'),
                  }}
                />
              </Card>
            ) : (
              <Card>
                <View style={{ paddingHorizontal: spacing.md }}>
                  {offers.map((offer) => (
                    <OfferRow
                      key={offer.id}
                      title={offer.title}
                      unit={offer.unit}
                      priceKopecks={offer.price}
                      stock={offer.stock}
                      badge={offer.badge}
                      archived={Boolean(offer.archivedAt)}
                      onPress={() =>
                        router.push(`/wholesale/offers/${offer.id}`)
                      }
                      testID={`edit-offer-${offer.id}`}
                    />
                  ))}
                </View>
              </Card>
            )}
          </View>

          {product.archivedAt ? (
            <Card>
              <Text variant="bodySmall" color="textSecondary">
                Товар в архиве с{' '}
                {new Date(product.archivedAt).toLocaleDateString('ru-RU')}.
                Восстановление — Промт 11.
              </Text>
            </Card>
          ) : (
            <Button
    variant="ghost"
    onPress={() => setConfirmArchive(true)}
    testID="edit-archive"
    >Архивировать товар</Button>
          )}
        </ScrollView>

        <Dialog
          visible={confirmArchive}
          onClose={() => setConfirmArchive(false)}
          title="Архивировать товар?"
        >
          <Text variant="bodySmall" color="textSecondary">
            {`«${product.title}» исчезнет из каталога для покупателей. Предложения и история сохранятся.`}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Button
                variant="secondary"
                onPress={() => setConfirmArchive(false)}
              >
                Отмена
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button
                onPress={() => {
                  setConfirmArchive(false);
                  archiveMutation.mutate(product.id, {
                    onSuccess: () => {
                      toast.show({ variant: 'success', message: 'Товар в архиве' });
                      router.replace('/wholesale/products');
                    },
                  });
                }}
              >
                Архивировать
              </Button>
            </View>
          </View>
        </Dialog>
      </View>
    </RoleScreen>
  );
}
