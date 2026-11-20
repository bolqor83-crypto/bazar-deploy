# @bazar/api — бэкенд Bazar

NestJS 11 + Prisma 6 + PostgreSQL (Neon) + Argon2id/JWT +
refresh-token family (Промт 7, ADR 0008; Промт 9 — Neon, ADR 0010).

Один порт отдаёт и API (`/api/*`), и статику mobile
(`MOBILE_DIST_PATH` → `apps/mobile/dist`): так устроен деплой на
Render через зеркало `bazar-deploy`, где сервис проксирует один порт.

## Запуск

```bash
cd apps/api
cp .env.example .env       # DATABASE_URL_POOLED/DIRECT, JWT_ACCESS_SECRET
npx prisma migrate deploy  # применить миграции (прод/демо)
# дев-схема с сид-данными:
npx prisma migrate dev
pnpm build && node dist/src/main.js   # :3000, health → /api/health
```

Демо-пользователь: **+79001234567 / qwerty123** (4 организации,
4 точки). Сборка mobile рядом с API (same-origin):

```bash
cd apps/mobile && EXPO_PUBLIC_API_URL=/api npx expo export --platform web
```

## Структура

```
src/
  main.ts            # точка входа: helmet, CORS, requestId, HTTP-лог
  config/env.ts      # загрузка и валидация окружения
  common/            # AppLogger (pino), request-context (ALS),
                     # http-log (HTTP-лог + userId из JWT), фильтры ошибок
  prisma/            # PrismaService (direct-подключение: транзакции)
  auth/              # регистрация, вход, OTP, сброс, refresh-семьи
  users/             # профиль
  organizations/     # организации, точки, членства
  catalog/           # категории, товары, офферы (публично)
  cart/              # корзина покупателя
  orders/            # заказы: создание, статусы, отмена
  seller/            # товары/офферы продавца, заказы продавца
  stock/             # склады: event-sourced движения (ADR 0012)
  delivery/          # доставки + лента перевозчика (ADR 0011)
  price-requests/    # «цена по запросу» (ADR 0016)
  market/            # позиция на рынке + маршрут (ADR 0017),
                     # analytics — Layer 0 (ADR 0019, Промт 18 C)
  notifications/     # уведомления
  uploads/           # пресайны/медиа
  seed/              # детерминированный демо-мир
prisma/
  schema.prisma      # модель данных (enum'ы — строками, проверка в DTO)
  migrations/        # SQL-миграции
```

## Эндпоинты

| Группа         | Пути                                                                                                 | Доступ                                      |
| -------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| auth           | `/api/auth/register, login, refresh, logout, me, otp/send, otp/verify, password/reset`               | публично (rate limit)                       |
| users          | `GET /api/users/me`                                                                                  | Bearer                                      |
| organizations  | `/api/organizations` CRUD, `/:id/locations`                                                          | Bearer + роли                               |
| locations      | `GET/PATCH /api/locations/:id`                                                                       | Bearer (PATCH — marketRow/Spot, Промт 17)   |
| catalog        | `/api/catalog/categories, products, products/:id, /offers, /similar/:id`                             | публично                                    |
| cart           | `/api/cart` + `/items`                                                                               | Bearer                                      |
| orders         | `POST/GET /api/orders`, `/:id`, `/:id/cancel`                                                        | Bearer (buyer)                              |
| seller         | `/api/seller/products, offers, orders/:id/:action`                                                   | Bearer + X-Organization-Id                  |
| stock          | `/api/stock/locations, balances, summary, movements, transfer`                                       | Bearer + организация                        |
| deliveries     | `/api/deliveries`, `/api/carrier/deliveries`                                                         | Bearer по ролям                             |
| price-requests | `/api/price-requests` + `/respond, /decline, /incoming`                                              | Bearer                                      |
| market         | `GET /api/market/route`, `PUT/GET/DELETE /api/market/position`                                       | Bearer (route — buyer; position — продавцы) |
| analytics      | `GET /api/market/trends, volumes` — публично; `GET /api/market/users, anomalies` — Bearer (продавцы) | Промт 18, C                                 |
| служебные      | `/api/health`, `/api/docs` (Swagger)                                                                 | публично                                    |

Rate limiting: login/register/otp/reset — 5/мин, refresh — 30/мин,
остальное — 100/мин на IP.

## Логирование (Промт 18, ADR 0018)

- HTTP-лог на каждый запрос: `requestId`, `userId` (sub из JWT,
  без верификации), `action` (`METHOD /path`), `status`,
  `duration_ms` — pino, JSON в stdout.
- События ключевых действий сервисов: `auth.login`,
  `order.created`, `stock.movement` (userId + агрегаты).
- Телефоны маскируются (`+7900***4567`), пароли/OTP/токены не
  логируются никогда.

## БД

PostgreSQL (Neon): pooled-подключение — для serverless,
direct — для миграций и интерактивных транзакций NestJS
(ADR 0010). Тестовая база — `bazar_test` в том же проекте
(схему пересоздаёт e2e global-setup).

## Тесты

```bash
pnpm --filter api test          # unit (280)
pnpm --filter api test:e2e      # e2e (143) — Neon bazar_test
```
