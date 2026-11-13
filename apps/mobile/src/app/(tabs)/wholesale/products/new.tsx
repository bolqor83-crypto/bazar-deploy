/**
 * Создание товара: 3 шага (Промт 10, Часть B).
 *
 * Основное (название/категория/единица) → Фото (presign + PUT) →
 * Первое предложение (цена/склад/мин. партия).
 *
 * Черновик автосохраняется в AsyncStorage (ключ по пользователю):
 * слабый сигнал в 4 утра не должен терять ввод. Прогресс-индикатор
 * шагов сверху. После успеха — переход в карточку товара.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image as ImageIcon } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Skeleton,
  Text,
  useTheme,
  useToast,
} from '@bazar/ui';
import { RoleScreen } from '../../../../components/shell/RoleScreen';
import {
  useCreateSellerOffer,
  useCreateSellerProduct,
  useSellerCategories,
} from '../../../../hooks/useSeller';
import { uploadImage } from '../../../../services/api/uploadApi';
import { useAuthStore } from '../../../../stores/authStore';

/** Черновик шага «Основное». */
interface DraftBasic {
  title: string;
  subtitle: string;
  categoryId: string;
  unit: string;
  description: string;
}

const EMPTY_BASIC: DraftBasic = {
  title: '',
  subtitle: '',
  categoryId: '',
  unit: 'кг',
  description: '',
};

const STEPS = ['Основное', 'Фото', 'Предложение'] as const;

const UPLOAD_ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];

/** Ключ черновика в AsyncStorage. */
function draftKey(userId: string): string {
  return `bazar.seller.product.draft.${userId}`;
}

export default function SellerProductNewScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const toast = useToast();
  const userId = useAuthStore((state) => state.user?.id ?? '');

  const [step, setStep] = useState(0);
  const [basic, setBasic] = useState<DraftBasic>(EMPTY_BASIC);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [minQuantity, setMinQuantity] = useState('1');
  const [uploading, setUploading] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const categoriesQuery = useSellerCategories();
  const createProduct = useCreateSellerProduct();
  const createOffer = useCreateSellerOffer();

  // Autosave черновика (debounce 500 мс).
  useEffect(() => {
    if (!draftLoaded || !userId) {
      return;
    }
    const timer = setTimeout(() => {
      void AsyncStorage.setItem(
        draftKey(userId),
        JSON.stringify({ basic, imageUrls, price, stock, minQuantity, step }),
      ).catch(() => undefined);
    }, 500);
    return () => clearTimeout(timer);
  }, [basic, imageUrls, price, stock, minQuantity, step, userId, draftLoaded]);

  // Восстановление черновика при монтировании.
  useEffect(() => {
    if (!userId) {
      return;
    }
    void AsyncStorage.getItem(draftKey(userId))
      .then((raw) => {
        if (raw) {
          try {
            const draft = JSON.parse(raw) as {
              basic?: Partial<DraftBasic>;
              imageUrls?: string[];
              price?: string;
              stock?: string;
              minQuantity?: string;
              step?: number;
            };
            setBasic({ ...EMPTY_BASIC, ...draft.basic });
            setImageUrls(draft.imageUrls ?? []);
            setPrice(draft.price ?? '');
            setStock(draft.stock ?? '');
            setMinQuantity(draft.minQuantity ?? '1');
            setStep(Math.min(2, Math.max(0, draft.step ?? 0)));
          } catch {
            // Битый черновик — начинаем с чистого листа.
          }
        }
      })
      .catch(() => undefined)
      .finally(() => setDraftLoaded(true));
  }, [userId]);

  const categories = categoriesQuery.data ?? [];
  const selectedCategory = categories.find((c) => c.id === basic.categoryId);

  const basicValid =
    basic.title.trim().length >= 2 &&
    Boolean(basic.categoryId) &&
    basic.unit.trim().length >= 1;
  const offerValid =
    Number(price) > 0 && Number(stock) >= 0 && Number(minQuantity) >= 1;

  /** Выбор файла через web input; загрузка через presign. */
  const onPickImage = () => {
    // Expo web: DOM input. На других платформах — заглушка до
    // expo-image-picker (Промт 11).
    if (typeof document === 'undefined') {
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        return;
      }
      const contentType = (UPLOAD_ACCEPT as string[]).includes(file.type)
        ? (file.type as 'image/jpeg' | 'image/png' | 'image/webp')
        : 'image/jpeg';
      setUploading(true);
      uploadImage(file, contentType)
        .then((publicUrl) => {
          setImageUrls((urls) => [...urls, publicUrl].slice(0, 6));
        })
        .catch(() => {
          toast.show({ variant: 'error', message: 'Не удалось загрузить фото. Файл должен быть JPEG, PNG или WebP до 5 МБ' });
        })
        .finally(() => setUploading(false));
    };
    input.click();
  };

  const busy = createProduct.isPending || createOffer.isPending;

  const onSubmit = () => {
    if (!basicValid || !offerValid) {
      return;
    }
    createProduct.mutate(
      {
        title: basic.title.trim(),
        subtitle: basic.subtitle.trim() || undefined,
        description: basic.description.trim() || undefined,
        categoryId: basic.categoryId,
        unit: basic.unit.trim(),
      },
      {
        onSuccess: (product) => {
          createOffer.mutate(
            {
              productId: product.id,
              price: Math.round(Number(price) * 100),
              stock: Number(stock),
              minQuantity: Number(minQuantity) || 1,
              images: imageUrls,
            },
            {
              onSuccess: () => {
                if (userId) {
                  void AsyncStorage.removeItem(draftKey(userId)).catch(
                    () => undefined,
                  );
                }
                toast.show({
                  variant: 'success',
                  message: `«${product.title}» появился в каталоге`,
                });
                router.replace(`/wholesale/products/${product.id}`);
              },
              onError: () => {
                // Товар создан, оффер нет: переходим в карточку —
                // предложение можно добавить там.
                toast.show({ variant: 'error', message: 'Товар создан без предложения. Добавьте партию в карточке товара' });
                router.replace(`/wholesale/products/${product.id}`);
              },
            },
          );
        },
        onError: () => {
          toast.show({ variant: 'error', message: 'Не удалось создать товар. Проверьте связь и попробуйте ещё раз' });
        },
      },
    );
  };

  const stepContent = useMemo(() => {
    if (step === 0) {
      if (categoriesQuery.isLoading) {
        return (
          <View style={{ padding: spacing.lg, gap: spacing.md }}>
            <Skeleton height={72} />
            <Skeleton height={72} />
            <Skeleton height={72} />
          </View>
        );
      }
      if (categoriesQuery.isError) {
        return (
          <ErrorState
            onRetry={() => {
              void categoriesQuery.refetch();
            }}
          />
        );
      }
      if (categories.length === 0) {
        return (
          <EmptyState
            icon={ImageIcon}
            title="Нет категорий"
            description="Каталог ещё не настроен — попробуйте позже."
          />
        );
      }
      return (
        <View style={{ gap: spacing.md }}>
          <Input
            label="Название"
            value={basic.title}
            onChangeText={(title) => setBasic((b) => ({ ...b, title }))}
            placeholder="Морковь мытая"
            testID="product-title-input"
          />
          <Input
            label="Подзаголовок (необязательно)"
            value={basic.subtitle}
            onChangeText={(subtitle) => setBasic((b) => ({ ...b, subtitle }))}
            placeholder="Новый урожай, 1 сорт"
            testID="product-subtitle-input"
          />
          <View style={{ gap: spacing.sm }}>
            <Text variant="bodySmall" color="textSecondary">
              Категория
            </Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: spacing.sm,
              }}
            >
              {categories.map((category) => (
                <Pressable
                  key={category.id}
                  testID={`product-category-${category.slug}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Категория ${category.name}`}
                  onPress={() =>
                    setBasic((b) => ({ ...b, categoryId: category.id }))
                  }
                  style={{
                    minHeight: 48,
                    justifyContent: 'center',
                    paddingHorizontal: spacing.md,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor:
                      basic.categoryId === category.id
                        ? colors.primary
                        : colors.border,
                  }}
                >
                  <Text variant="bodySmall">{category.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Input
            label="Единица измерения"
            value={basic.unit}
            onChangeText={(unit) => setBasic((b) => ({ ...b, unit }))}
            placeholder="кг"
            hint="Как продаёте: кг, шт, ящик"
            testID="product-unit-input"
          />
          <Input
            label="Описание (необязательно)"
            value={basic.description}
            onChangeText={(description) =>
              setBasic((b) => ({ ...b, description }))
            }
            placeholder="Сладкая, мытая, калибровка 1 сорт"
            multiline
            testID="product-description-input"
          />
        </View>
      );
    }
    if (step === 1) {
      return (
        <View style={{ gap: spacing.md }}>
          <Card>
            <View style={{ gap: spacing.sm }}>
              <Text variant="body">
                {imageUrls.length > 0
                  ? `Загружено фото: ${imageUrls.length}`
                  : 'Фото пока нет'}
              </Text>
              <Text variant="caption" color="textSecondary">
                JPEG, PNG или WebP до 5 МБ. Первое фото — главное в каталоге.
              </Text>
              <Button
                variant="secondary"
                onPress={onPickImage}
                disabled={uploading}
                testID="product-pick-photo"
              >
                {uploading ? 'Загружаем…' : 'Выбрать фото'}
              </Button>
            </View>
          </Card>
          {imageUrls.map((url) => (
            <Card key={url}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.md,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    backgroundColor: colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ImageIcon size={22} color={colors.textMuted} />
                </View>
                <Text
                  variant="caption"
                  color="textSecondary"
                  style={{ flex: 1 }}
                  numberOfLines={1}
                >
                  {url}
                </Text>
              </View>
            </Card>
          ))}
        </View>
      );
    }
    return (
      <View style={{ gap: spacing.md }}>
        <Input
          label="Цена, ₽ за единицу"
          value={price}
          onChangeText={setPrice}
          placeholder="45"
          keyboardType="numeric"
          testID="offer-price-input"
        />
        <Input
          label="Склад"
          value={stock}
          onChangeText={setStock}
          placeholder="100"
          keyboardType="numeric"
          hint="Сколько единиц готовы продать"
          testID="offer-stock-input"
        />
        <Input
          label="Минимальная партия"
          value={minQuantity}
          onChangeText={setMinQuantity}
          placeholder="10"
          keyboardType="numeric"
          testID="offer-min-input"
        />
        <Card>
          <Text variant="caption" color="textSecondary">
            {selectedCategory
              ? `Категория: ${selectedCategory.name}`
              : 'Категория не выбрана'}
            {'\n'}
            Черновик сохраняется автоматически.
          </Text>
        </Card>
      </View>
    );
    // onPickImage — стабилен в рамках рендера (замыкание на state).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    step,
    basic,
    categories,
    categoriesQuery.isLoading,
    categoriesQuery.isError,
    imageUrls,
    uploading,
    price,
    stock,
    minQuantity,
    selectedCategory,
    colors,
    spacing,
  ]);

  return (
    <RoleScreen role="wholesale_seller" section="products" title="Новый товар">
      <View style={{ flex: 1, width: '100%' }}>
        {/* Прогресс шагов */}
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: spacing.md,
            paddingTop: spacing.sm,
            gap: spacing.sm,
          }}
        >
          {STEPS.map((label, index) => (
            <View key={label} style={{ flex: 1, gap: 4 }}>
              <View
                style={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor:
                    index <= step ? colors.primary : colors.border,
                }}
              />
              <Text
                variant="caption"
                color={index <= step ? 'text' : 'textSecondary'}
              >
                {`${index + 1}. ${label}`}
              </Text>
            </View>
          ))}
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: spacing.xl,
            gap: spacing.md,
          }}
        >
          {stepContent}
        </ScrollView>

        <View
          style={{
            flexDirection: 'row',
            gap: spacing.sm,
            padding: spacing.md,
          }}
        >
          {step > 0 ? (
            <View style={{ flex: 1 }}>
              <Button
                variant="secondary"
                onPress={() => setStep((s) => s - 1)}
                testID="product-step-back"
              >
                Назад
              </Button>
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            {step < 2 ? (
              <Button
                onPress={() => setStep((s) => s + 1)}
                disabled={step === 0 && !basicValid}
                testID="product-step-next"
              >
                Далее
              </Button>
            ) : (
              <Button
                onPress={onSubmit}
                disabled={!basicValid || !offerValid || busy}
                testID="product-submit"
              >
                {busy ? 'Сохраняем…' : 'Опубликовать'}
              </Button>
            )}
          </View>
        </View>
      </View>
    </RoleScreen>
  );
}
