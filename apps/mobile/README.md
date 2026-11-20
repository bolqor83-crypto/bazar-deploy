# @bazar/mobile — приложение Bazar

Expo SDK (managed) + React Native + Expo Router (file-based) +
Zustand + TanStack Query. Сборка для веба — статический экспорт
(`expo export --platform web`), который отдаёт NestJS вместе с API
(same-origin, `EXPO_PUBLIC_API_URL=/api`).

## Запуск

```bash
pnpm install
# локальный API на :3000 (см. apps/api/README.md), затем:
EXPO_PUBLIC_API_URL=/api npx expo export --platform web  # статика → dist/
pnpm mobile                        # Expo dev server (нативные платформы)
```

## Структура экранов (`src/app`)

| Раздел             | Экраны                                                                                                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `(auth)`           | login, register, otp, reset-request, reset-confirm                                                                                                                                                                             |
| `(onboarding)`     | welcome, role, organization, location, done                                                                                                                                                                                    |
| `(tabs)/customer`  | каталог, карточка товара, корзина, checkout, заказы + детали, запросы цены, доставки, маршрут по рынку, избранное, уведомления, профиль                                                                                        |
| `(tabs)/wholesale` | витрина продавца: заказы, товары/офферы, запросы цены, склад (остатки/движения/перемещения/локации), аналитика (Промт 18 D), долги, финансы, клиенты, доставки, точка на рынке, маршрут, заметки, персонал, настройки, профиль |
| `(tabs)/store`     | витрина точки: закупка, заказы, склад точки, долги, финансы, точка на рынке, маршрут, заметки, ещё                                                                                                                             |
| `(tabs)/carrier`   | лента доставок, мои доставки, детали, история, профиль                                                                                                                                                                         |
| `dev/`             | design (витрина дизайн-системы, только `__DEV__`), logs (журнал логов, все сборки — Промт 18 A)                                                                                                                                |

Роли и защита: каждая группа — в `AuthGuard` + `RoleGuard`
(`(tabs)/<role>/_layout.tsx`); активная роль переключается
контекст-листом (contextStore, persist).

## Слои приложения

```
src/
  app/               # маршруты Expo Router (тонкие обёртки)
  components/
    screens/         # экраны (логика + разметка) — тестируются
    guards/          # AuthGuard, RoleGuard, OnboardingGuard
    shell/           # AppHeader, RoleShell, вкладки
  stores/            # Zustand: auth, context, onboarding
  services/api/      # HTTP-клиент (client.ts) + API-модули по доменам
  services/storage/  # tokenStorage: web — sessionStorage,
                     # native — expo-secure-store
  utils/             # logger (Промт 18), clipboard, группировки
```

## Логирование (Промт 18, ADR 0018)

`utils/logger.ts` — ring-buffer на 100 записей: `error` → тост
«Скопировать лог», `warn` — без тоста, `info` — только `__DEV__`.
Сетевые сбои и 5xx ловит HTTP-клиент, падения React — ErrorBoundary
в корневом layout. Диагностика: прямой URL `/dev/logs`.

## Тесты

```bash
pnpm --filter mobile test   # 494 unit (jest-expo + RNTL)
```

Golden-кадры: `pnpm golden:update` / `pnpm test:visual`
(pixelmatch ≤ 0.5%, см. корневой README и AGENTS.md).
