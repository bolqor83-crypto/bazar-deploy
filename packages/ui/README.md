# @bazar/ui — дизайн-система Bazar

Токены, темы (light/dark/system) и компоненты мобильного
приложения. Основана в Промте 2 (ADR 0002), расширена в 6–18.

## Состав (53 компонента)

| Категория        | Компоненты                                                                                                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Базовые          | `Text`, `Button`, `IconButton`, `Input`, `Card`, `Badge`, `Skeleton`, `EmptyState`, `ErrorState`, `Divider`, `Dialog`, `Toast`                                                      |
| Формы            | `Checkbox`, `Radio`, `Switch`, `Select`, `DatePicker`, `QuantitySelector`, `PriceRangeInput`, `FilterChip`, `SearchBar`, `SegmentedControl`, `SortPicker`                           |
| Каталог          | `ProductCard`, `ProductDetailCard`, `ProductRow`, `ProductPlaceholder`, `ProductGallery`, `HorizontalProductCarousel`, `CategoryChip`, `PriceDisplay`, `StockDot`, `StockIndicator` |
| Заказы           | `CartItemCard`, `OrderCard`, `OrderPartyGroup`, `OrderStatus`, `OrderSummary`, `OrderTimeline`, `OfferRow`, `MovementRow`, `StockRow`                                               |
| Доставка         | `DeliveryCard`, `DeliveryRequestCard`, `DeliveryTimeline`                                                                                                                           |
| Стороны сделки   | `PartyCard`, `LocationSelector`, `PriceRequestDialog`, `SectionHeader`                                                                                                              |
| Рынок (Промт 17) | `MarketMap` (SVG-схема рынка), `RouteStopRow` (остановка маршрута)                                                                                                                  |

Токены: `colors`, `typography`, `spacing`, `radii`, `shadows`,
`durations`/`springs`/`easings`, хаптика (`hapticTap`…), силуэты
продукции (SILHOUETTE_*, Промт 16 A). Тема: `ThemeProvider`,
`useTheme`, `useThemeStore` (light/dark/system, персист
`bazar.theme.mode`). Провайдер: `BazarUIProvider` = SafeArea +
Theme + Toast.

## Быстрый старт

```tsx
import { BazarUIProvider, Button, Text } from '@bazar/ui';

<BazarUIProvider>
  <Text variant="h3">Закупка</Text>
  <Button variant="primary" onPress={save}>
    Сохранить
  </Button>
</BazarUIProvider>;
```

Тост с действием (Промт 18): кнопка внутри карточки, нажатие
выполняет действие и закрепляет уведомление (автоскрытие
останавливается).

```tsx
import { useToastStore } from '@bazar/ui';

useToastStore.getState().show({
  variant: 'error',
  message: 'Ошибка',
  action: { label: 'Скопировать лог', run: copyLogs },
});
```

## Правила использования

- Текст — только через `<Text>`; «сырые» стили текста в экранах запрещены.
- Цвета и отступы — только из токенов темы (`useTheme()`), никаких литералов.
- Body ≥ 17 pt, зоны нажатия ≥ 48×48 pt (заложено в размерах компонентов).
- Состояния загрузки — только `<Skeleton>`; спиннеры запрещены.
- Красный запрещён: `danger` — терракота, предупреждения — янтарь.
- Пары «текст/фон» проходят WCAG AA 4.5:1 — тест контраста в
  `src/components/__tests__/contrast.test.ts`.

## Тесты

```bash
pnpm --filter ui test   # 538 unit: рендер, варианты, a11y, контраст
```

## Витрина

`/dev/design` в приложении (только dev-сборки) показывает все
компоненты в текущей теме.
