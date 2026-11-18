/**
 * /dev/design — витрина дизайн-системы Bazar (Промт 2).
 *
 * Показывает все компоненты дизайн-системы в текущей теме. Доступен
 * только в dev-сборках: в продакшене редиректит на главную.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Carrot, SlidersHorizontal, User } from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  CategoryChip,
  Checkbox,
  DatePicker,
  DeliveryCard,
  Dialog,
  Divider,
  EmptyCatalogState,
  EmptyState,
  ErrorState,
  FilterChip,
  HorizontalProductCarousel,
  IconButton,
  Input,
  LocationSelector,
  OrderStatus,
  OrderSummary,
  PartyCard,
  PriceDisplay,
  PriceRangeInput,
  ProductCard,
  ProductDetailCard,
  ProductGallery,
  QuantitySelector,
  Radio,
  SearchBar,
  SectionHeader,
  Select,
  Skeleton,
  SortPicker,
  StockIndicator,
  Switch,
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
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<
    'popular' | 'price-asc' | 'price-desc' | 'name'
  >('popular');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [activeCategory, setActiveCategory] = useState('vegetables');
  const [selectValue, setSelectValue] = useState<string | null>('msk');
  const [checkboxChecked, setCheckboxChecked] = useState(true);
  const [radioValue, setRadioValue] = useState('courier');
  const [switchOn, setSwitchOn] = useState(false);
  // Динамическая дата (сегодня + 2): статичная «15.11.2026» в
  // прошлом читалась VLM-аудитом как заглушка/ошибка. Границы
  // календаря — один раз за монтирование, не в каждом рендере.
  const [pickedDate, setPickedDate] = useState<Date | null>(
    () => new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
  );
  const [dateBounds] = useState(() => ({
    min: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    max: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
  }));

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
          36 компонентов · токены · темы light/dark/system · режим: {mode}
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
              label="ИНН организации"
              value="402345678"
              onChangeText={() => {}}
              error="В ИНН должно быть 10 или 12 цифр — проверьте количество"
              hint="Как в документах организации"
            />
          </View>
        </Section>

        {/* Промт 12 (доработка по VLM-аудиту): секция собрана как
            реальная форма «Параметры поставки», а не как стенд с
            разрозненными контролами — так она читается рабочим
            экраном, а не UI-китом. */}
        <Section title="Формы">
          <Card
            variant="outlined"
            style={{ padding: spacing.md, gap: spacing.md }}
          >
            <View style={{ gap: 2 }}>
              <Text variant="h3">Параметры поставки</Text>
              <Text variant="caption" color="textSecondary">
                Применяются к новым заказам этой точки
              </Text>
            </View>
            <Select
              label="Склад отгрузки"
              value={selectValue}
              onChange={setSelectValue}
              options={[
                {
                  value: 'msk',
                  label: 'Основной склад',
                  hint: 'ул. Южная, 12',
                },
                {
                  value: 'north',
                  label: 'Точка на Северной',
                  hint: 'ул. Северная, 1',
                },
                { value: 'spb', label: 'Склад в Петербурге' },
              ]}
              placeholder="Выберите склад"
            />
            <View style={{ gap: spacing.xs }}>
              <Text variant="bodySmall" color="textSecondary">
                Условия товара
              </Text>
              <Checkbox
                checked={checkboxChecked}
                onChange={setCheckboxChecked}
                label="Скоропортящийся товар"
                hint="Хранение до 12 часов"
              />
              <Checkbox
                checked={!checkboxChecked}
                onChange={() => setCheckboxChecked((v) => !v)}
                label="Требует сертификации"
                hint="Приложите документ при отгрузке"
              />
            </View>
            <View style={{ gap: spacing.xs }}>
              <Text variant="bodySmall" color="textSecondary">
                Способ доставки
              </Text>
              <Radio
                selected={radioValue === 'courier'}
                onPress={() => setRadioValue('courier')}
                label="Доставка перевозчиком"
                hint="От 2 часов по городу"
              />
              <Radio
                selected={radioValue === 'pickup'}
                onPress={() => setRadioValue('pickup')}
                label="Самовывоз со склада"
                hint="Бесплатно, в рабочие часы"
              />
            </View>
            <Switch
              value={switchOn}
              onChange={setSwitchOn}
              label="Автоприём заказов"
              hint={
                switchOn
                  ? 'Заказы до 20 000 ₽ подтверждаются сами'
                  : 'Каждый заказ ждёт вашего подтверждения'
              }
            />
            <DatePicker
              label="Ближайшая дата поставки"
              value={pickedDate}
              onChange={setPickedDate}
              min={dateBounds.min}
              max={dateBounds.max}
            />
            <Button size="lg" fullWidth>
              Сохранить параметры
            </Button>
          </Card>
        </Section>

        <Section title="Карточки">
          <View style={{ gap: spacing.md }}>
            <Card>
              <Text variant="bodyStrong">Карточка товара (default)</Text>
              <Text variant="bodySmall" color="textSecondary">
                Тень sm, без границы — витрина, каталог, карусель
              </Text>
            </Card>
            <Card variant="elevated">
              <Text variant="bodyStrong">Приподнятая (elevated)</Text>
              <Text variant="bodySmall" color="textSecondary">
                Тень md — акцентные блоки, модальные подсказки
              </Text>
            </Card>
            <Card variant="outlined">
              <Text variant="bodyStrong">Контурная (outlined)</Text>
              <Text variant="bodySmall" color="textSecondary">
                Граница — формы, сводки, профиль
              </Text>
            </Card>
            <Card variant="flat">
              <Text variant="bodyStrong">Плоская (flat)</Text>
              <Text variant="bodySmall" color="textSecondary">
                Без границы и тени — контент-блок «часть страницы»
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

          <Text variant="h3">HorizontalProductCarousel</Text>
          <HorizontalProductCarousel
            title="Похожие товары"
            items={[
              {
                id: 'c1',
                title: 'Огурцы гладкие',
                subtitle: 'Овощи',
                image: '/api/media/seed/products/cucumbers.png',
                price: 10_400,
                unit: '1 кг',
              },
              {
                id: 'c2',
                title: 'Бананы',
                image: '/api/media/seed/products/bananas.png',
                price: 8_900,
                unit: '1 кг',
                badge: 'Скоропорт',
              },
              {
                id: 'c3',
                title: 'Яблоки Гала',
                image: '/api/media/seed/products/apples.png',
                price: 12_000,
                unit: '1 кг',
              },
            ]}
            onItemPress={() => {}}
            onSeeAllPress={() => {}}
          />

          <Text variant="h3">ProductRow и OrderSummary</Text>
          <Card variant="outlined">
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

        <Section title="Каталог (Промт 8)">
          <View style={{ gap: spacing.md }}>
            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder="Поиск: помидоры, яблоки…"
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm }}
            >
              <CategoryChip
                label="Все"
                active={activeCategory === 'all'}
                onPress={() => setActiveCategory('all')}
              />
              <CategoryChip
                label="Овощи"
                icon={Carrot}
                active={activeCategory === 'vegetables'}
                onPress={() => setActiveCategory('vegetables')}
              />
              <CategoryChip
                label="Фрукты"
                active={activeCategory === 'fruits'}
                onPress={() => setActiveCategory('fruits')}
              />
              <CategoryChip
                label="Зелень"
                active={activeCategory === 'greens'}
                onPress={() => setActiveCategory('greens')}
              />
            </ScrollView>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: spacing.sm,
              }}
            >
              <SortPicker value={sort} onChange={setSort} />
              <FilterChip
                label="Фильтры"
                icon={SlidersHorizontal}
                active={priceMin !== '' || priceMax !== ''}
                onPress={() => {}}
              />
              {search ? (
                <FilterChip label={search} onRemove={() => setSearch('')} />
              ) : null}
            </View>

            <PriceRangeInput
              min={priceMin}
              max={priceMax}
              onMinChange={setPriceMin}
              onMaxChange={setPriceMax}
            />

            <SectionHeader
              title="Товар дня"
              actionLabel="Все"
              onAction={() => {}}
            />

            <ProductGallery
              images={[
                'https://picsum.photos/seed/a/800/600',
                'https://picsum.photos/seed/b/800/600',
              ]}
              slideWidth={280}
            />

            <ProductDetailCard
              name="Помидоры розовые"
              description="Розовые томаты грунтовые, калибр 5+, мясистые, сладкие."
              unit="1 кг"
              priceKopecks={18_900}
              stock="in"
              minQuantity={5}
              isHit
              isPerishable
              sellerName="Опт-Юг"
              offers={[
                {
                  id: 'o1',
                  organizationName: 'Опт-Юг',
                  priceKopecks: 18_900,
                  stock: 53,
                  minQuantity: 5,
                },
                {
                  id: 'o2',
                  organizationName: 'Сеть «У дома»',
                  priceKopecks: 23_700,
                  stock: 82,
                  minQuantity: 1,
                },
              ]}
            />

            <EmptyCatalogState hasFilters onReset={() => {}} />
          </View>
        </Section>

        <Divider inset="none" />
        <View style={{ marginTop: spacing.xl }}>
          <Text variant="caption" color="textMuted" align="center">
            Bazar · дизайн-система · Промты 2, 6 и 8
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
