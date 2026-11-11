/**
 * /dev/design — витрина дизайн-системы Bazar (Промт 2).
 *
 * Показывает все 12 компонентов в текущей теме. Доступен только
 * в dev-сборках: в продакшене редиректит на главную.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { User } from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  DeliveryCard,
  Dialog,
  Divider,
  EmptyState,
  ErrorState,
  IconButton,
  Input,
  LocationSelector,
  OrderStatus,
  OrderSummary,
  PartyCard,
  PriceDisplay,
  ProductCard,
  QuantitySelector,
  Skeleton,
  StockIndicator,
  Text,
  ToastProvider,
  useTheme,
  useThemeStore,
  useToast,
} from '@bazar/ui';
import { AuthGuard } from '../../components/guards/AuthGuard';

/** В проде витрина недоступна. */
function useDevOnly(): boolean {
  const router = useRouter();
  const [allowed] = useState(() => __DEV__);
  useEffect(() => {
    if (!allowed) {
      router.replace('/');
    }
  }, [allowed, router]);
  return allowed;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing.xxl }}>
      <Text variant="h3" style={{ marginBottom: spacing.md }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function ShowcaseBody() {
  const { colors, spacing, radii } = useTheme();
  const mode = useThemeStore((s) => s.mode);
  const cycleMode = useThemeStore((s) => s.cycleMode);
  const { show } = useToast();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(3);
  const [location, setLocation] = useState<string | null>('l1');
  const [delivery, setDelivery] = useState<'pickup' | 'delivery'>('pickup');

  return (
    <ToastProvider>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          padding: spacing.xl,
          paddingBottom: spacing.xxxl,
        }}
      >
        <Text variant="display" style={{ marginBottom: spacing.sm }}>
          Дизайн-система Bazar
        </Text>
        <Text
          variant="bodySmall"
          color="textSecondary"
          style={{ marginBottom: spacing.lg }}
        >
          22 компонента · токены · темы light/dark/system · режим: {mode}
        </Text>

        <Button variant="ghost" size="sm" onPress={cycleMode}>
          Переключить тему
        </Button>

        <Section title="Текст">
          <Text variant="h1">Заголовок h1 — 28/36</Text>
          <Text variant="body" style={{ marginTop: spacing.sm }}>
            Body 17pt — основной текст приложения: читается в 4 утра, в
            перчатках, при слабом свете.
          </Text>
          <Text
            variant="bodySmall"
            color="textSecondary"
            style={{ marginTop: spacing.sm }}
          >
            Body small — 15pt, второстепенное
          </Text>
          <Text
            variant="caption"
            color="textMuted"
            style={{ marginTop: spacing.sm }}
          >
            Caption 13pt — подписи
          </Text>
          <Text variant="bodyStrong" mono style={{ marginTop: spacing.sm }}>
            1 250 000 ₽ · табличные цифры
          </Text>
        </Section>

        <Section title="Кнопки">
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}
          >
            <Button variant="primary">Основная</Button>
            <Button variant="secondary">Вторичная</Button>
            <Button variant="ghost">Призрачная</Button>
            <Button variant="destructive">Осторожно</Button>
            <Button loading>Загрузка</Button>
            <Button disabled>Недоступна</Button>
            <Button size="sm">Малая</Button>
            <Button size="lg">Крупная</Button>
          </View>
        </Section>

        <Section title="Иконочные кнопки">
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.md,
              alignItems: 'center',
            }}
          >
            <IconButton
              icon={User}
              accessibilityLabel="Профиль, малый"
              size="sm"
            />
            <IconButton
              icon={User}
              accessibilityLabel="Профиль, средний"
              size="md"
            />
            <IconButton
              icon={User}
              accessibilityLabel="Профиль, крупный"
              size="lg"
            />
            <IconButton
              icon={User}
              accessibilityLabel="Профиль, призрачный"
              variant="ghost"
            />
            <IconButton
              icon={User}
              accessibilityLabel="Профиль, недоступен"
              disabled
            />
          </View>
        </Section>

        <Section title="Поле ввода">
          <View style={{ gap: spacing.xl }}>
            <Input
              label="Название точки"
              placeholder="Точка на Садовой"
              value={inputValue}
              onChangeText={(text: string) => {
                setInputValue(text);
                setInputError(
                  text.length > 0 && text.length < 3
                    ? 'Слишком короткое название'
                    : null,
                );
              }}
              hint={inputError ?? 'Как его увидят покупатели'}
              error={inputError}
            />
            <Input
              label="ИНН"
              value=""
              onChangeText={() => {}}
              error="Проверьте ИНН"
            />
          </View>
        </Section>

        <Section title="Карточки">
          <View style={{ gap: spacing.md }}>
            <Card>
              <Text variant="bodyStrong">Обычная карточка</Text>
              <Text variant="bodySmall" color="textSecondary">
                Фон surface, граница border
              </Text>
            </Card>
            <Card variant="elevated">
              <Text variant="bodyStrong">Приподнятая карточка</Text>
              <Text variant="bodySmall" color="textSecondary">
                Тень md в светлой теме, граница в тёмной
              </Text>
            </Card>
            <Card variant="outlined" onPress={() => {}}>
              <Text variant="bodyStrong">Контурная, нажимается</Text>
            </Card>
          </View>
        </Section>

        <Section title="Бейджи">
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
          >
            <Badge>Нейтральный</Badge>
            <Badge variant="success">Оплачено</Badge>
            <Badge variant="warning">Долг</Badge>
            <Badge variant="danger">Просрочено</Badge>
            <Badge variant="info">Новое</Badge>
            <Badge variant="success" size="sm">
              12
            </Badge>
          </View>
        </Section>

        <Section title="Скелетон">
          <View style={{ gap: spacing.md }}>
            <Skeleton height={24} width="70%" />
            <Skeleton height={16} width="90%" />
            <Skeleton height={16} width="50%" />
            <Skeleton height={80} radius={radii.md} />
          </View>
        </Section>

        <Section title="Пустое состояние">
          <EmptyState
            title="Пока нет активной закупки"
            description="Соберите список на завтра."
            action={{ label: 'Создать закупку', onPress: () => {} }}
          />
        </Section>

        <Section title="Состояние ошибки">
          <ErrorState onRetry={() => {}} />
        </Section>

        <Section title="Разделители">
          <Divider />
          <View style={{ height: spacing.md }} />
          <Divider inset="md" />
          <View style={{ height: spacing.md }} />
          <Divider inset="lg" />
        </Section>

        <Section title="Диалог (нижний шит)">
          <Button variant="secondary" onPress={() => setDialogVisible(true)}>
            Открыть шит
          </Button>
          <Dialog
            visible={dialogVisible}
            onClose={() => setDialogVisible(false)}
            title="Пример шита"
          >
            <Text variant="bodySmall" color="textSecondary">
              Появляется пружиной снизу, закрывается свайпом за ручку, тапом по
              подложке или кнопкой ниже.
            </Text>
            <View style={{ marginTop: spacing.lg }}>
              <Button onPress={() => setDialogVisible(false)}>Понятно</Button>
            </View>
          </Dialog>
        </Section>

        <Section title="Тосты">
          <View style={{ gap: spacing.md }}>
            <Button
              variant="secondary"
              onPress={() =>
                show({
                  variant: 'success',
                  message: 'Заказ отправлен поставщику',
                })
              }
            >
              Тост «успех»
            </Button>
            <Button
              variant="secondary"
              onPress={() =>
                show({
                  variant: 'error',
                  message: 'Не удалось сохранить черновик',
                })
              }
            >
              Тост «ошибка»
            </Button>
            <Button
              variant="secondary"
              onPress={() =>
                show({
                  variant: 'info',
                  message: 'Прайс обновлён 5 минут назад',
                })
              }
            >
              Тост «инфо»
            </Button>
          </View>
        </Section>

        <Section title="Бизнес-компоненты">
          <Text variant="bodySmall" color="textSecondary">
            10 компонентов Промта 6: цены в копейках с узким неразрывным
            пробелом U+202F, статусы заказов, карточки сторон, выбор точки и
            способа получения.
          </Text>

          <Text variant="h3">PriceDisplay</Text>
          <View style={{ gap: spacing.md }}>
            <PriceDisplay value={89_000} size="lg" />
            <PriceDisplay value={85_000} oldPrice={100_000} />
            <PriceDisplay value={125_50} />
          </View>

          <Text variant="h3">QuantitySelector</Text>
          <QuantitySelector
            value={quantity}
            onChange={setQuantity}
            min={0}
            max={9}
          />

          <Text variant="h3">StockIndicator</Text>
          <View style={{ gap: spacing.sm }}>
            <StockIndicator stock="in" />
            <StockIndicator stock="low" />
            <StockIndicator stock="out" />
          </View>

          <Text variant="h3">OrderStatus</Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.sm,
            }}
          >
            <OrderStatus status="new" />
            <OrderStatus status="assembling" />
            <OrderStatus status="in_delivery" />
            <OrderStatus status="completed" />
            <OrderStatus status="cancelled" />
            <OrderStatus status="disputed" />
          </View>

          <Text variant="h3">ProductCard</Text>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <ProductCard
              name="Молоко 3,2%"
              priceKopecks={8_900}
              unit="1 л"
              stock="in"
            />
            <ProductCard
              name="Сыр «Гауда»"
              priceKopecks={55_000}
              oldPriceKopecks={65_000}
              unit="300 г"
              stock="low"
            />
          </View>

          <Text variant="h3">ProductRow и OrderSummary</Text>
          <Card>
            <OrderSummary
              items={[
                {
                  name: 'Молоко 3,2%',
                  priceKopecks: 8_900,
                  quantity: 2,
                  unit: 'л',
                },
                { name: 'Сыр «Гауда»', priceKopecks: 55_000, quantity: 1 },
                {
                  name: 'Картофель',
                  priceKopecks: 4_500,
                  quantity: 5,
                  unit: 'кг',
                },
              ]}
            />
          </Card>

          <Text variant="h3">PartyCard</Text>
          <PartyCard
            name="Опт-Юг"
            subtitle="Оптовый продавец"
            rating={4.8}
            verified
          />
          <PartyCard name="Транс-Логистик" subtitle="Перевозчик" rating={4.2} />

          <Text variant="h3">LocationSelector</Text>
          <LocationSelector
            locations={[
              {
                id: 'l1',
                name: 'Точка на Садовой',
                address: 'ул. Садовая, 12',
              },
              {
                id: 'l2',
                name: 'Точка на Доватора',
                address: 'ул. Доватора, 45',
              },
              {
                id: 'l3',
                name: 'Точка в Аксае',
                address: 'г. Аксай, пр. Ленина, 3',
              },
            ]}
            value={location}
            onChange={setLocation}
          />

          <Text variant="h3">DeliveryCard</Text>
          <DeliveryCard
            method="pickup"
            address="ул. Садовая, 12"
            time="сегодня, после 14:00"
            selected={delivery === 'pickup'}
            onPress={() => setDelivery('pickup')}
          />
          <DeliveryCard
            method="delivery"
            address="До двери"
            time="завтра, 10:00–14:00"
            priceKopecks={25_000}
            selected={delivery === 'delivery'}
            onPress={() => setDelivery('delivery')}
          />
        </Section>

        <Divider inset="none" />
        <View style={{ marginTop: spacing.xl }}>
          <Text variant="caption" color="textMuted" align="center">
            Bazar · дизайн-система · Промты 2 и 6
          </Text>
        </View>
      </ScrollView>
    </ToastProvider>
  );
}

export default function DesignShowcaseScreen() {
  const allowed = useDevOnly();
  if (!allowed) {
    return null;
  }
  // Витрина доступна без входа (requireAuth={false}); аутентифицированного
  // AuthGuard уведёт в приложение. Только __DEV__-сборки.
  return (
    <AuthGuard requireAuth={false}>
      <ShowcaseBody />
    </AuthGuard>
  );
}
