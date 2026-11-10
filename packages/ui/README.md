# @bazar/ui — дизайн-система Bazar

Токены, темы (light/dark/system) и 12 базовых компонентов мобильного
приложения. Построена в Промте 2 (см. `docs/adr/0002-дизайн-система.md`).

## Состав

| Категория | Что внутри |
|---|---|
| Токены | `colors`, `typography`, `spacing`, `radii`, `shadows`, `durations`/`springs`/`easings`, хаптика (`hapticTap`…`hapticSelection`) |
| Тема | `ThemeProvider`, `useTheme`, `useThemeColors`, `useThemeStore` (light/dark/system, персист `bazar.theme.mode`) |
| Провайдер | `BazarUIProvider` = SafeAreaProvider + ThemeProvider + ToastProvider |
| Компоненты | `Text`, `Button`, `IconButton`, `Input`, `Card`, `Badge`, `Skeleton`, `EmptyState`, `ErrorState`, `Divider`, `Dialog`, `Toast` |

## Быстрый старт

```tsx
import { BazarUIProvider, Button, Text } from '@bazar/ui';

<BazarUIProvider>
  <Text variant="h3">Закупка</Text>
  <Button variant="primary" onPress={save}>Сохранить</Button>
</BazarUIProvider>
```

## Правила использования

- Текст — только через `<Text>`; «сырые» стили текста в экранах запрещены.
- Цвета и отступы — только из токенов темы (`useTheme()`), никаких литералов.
- Body ≥ 17 pt, зоны нажатия ≥ 48×48 pt (заложено в размерах компонентов).
- Состояния загрузки — только `<Skeleton>`; спиннеры запрещены.
- Красный запрещён: `danger` — терракота, предупреждения — янтарь (`accent`).
- Все пары «текст/фон» проходят WCAG AA 4.5:1 — тест
  `src/components/__tests__/contrast.test.ts`.

## Тесты

```bash
pnpm --filter @bazar/ui test
```

103 теста: компоненты (рендер, варианты, a11y, поведение) + контраст WCAG AA
(11 пар × 2 темы, формула яркости посчитана вручную, без библиотек).

## Витрина

`/dev/design` в приложении (только dev-сборки) показывает все компоненты
в текущей теме.
