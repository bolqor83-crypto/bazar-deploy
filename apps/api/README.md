# @bazar/api — бэкенд Bazar

NestJS + Prisma + Argon2id/JWT + refresh-token family (Промт 7, ADR 0008).

Один порт отдаёт и API (`/api/*`), и статику mobile (`apps/mobile/dist`):
так устроен деплой через preview-шлюз платформы, который проксирует
ровно один порт.

## Эндпоинты

| Метод | Путь                               | Описание                               |
| ----- | ---------------------------------- | -------------------------------------- |
| POST  | `/api/auth/register`               | Регистрация (телефон + пароль + имя)   |
| POST  | `/api/auth/login`                  | Вход по паролю                         |
| POST  | `/api/auth/refresh`                | Ротация пары токенов (reuse detection) |
| POST  | `/api/auth/logout`                 | Отзыв сессии                           |
| GET   | `/api/auth/me`                     | Профиль + членства + точки (Bearer)    |
| POST  | `/api/auth/otp/send`               | OTP-код (в dev — `devCode` в ответе)   |
| POST  | `/api/auth/otp/verify`             | Вход по коду                           |
| POST  | `/api/auth/password/reset`         | Сброс пароля по коду                   |
| POST  | `/api/organizations`               | Создать организацию (владелец)         |
| GET   | `/api/organizations`               | Свои организации                       |
| GET   | `/api/organizations/:id`           | Детали (участникам)                    |
| POST  | `/api/organizations/:id/locations` | Точка (RETAIL + STORE_OWNER)           |
| GET   | `/api/organizations/:id/locations` | Точки организации                      |
| GET   | `/api/locations/:id`               | Детали точки                           |
| GET   | `/api/users/me`                    | Профиль без токенов                    |
| GET   | `/api/health`                      | `{ status, db, version }`              |
| GET   | `/api/docs`                        | Swagger UI (также `/api/docs-json`)    |

Rate limiting: login/register/otp/reset — 5/мин, refresh — 30/мин,
остальное — 100/мин на IP.

## Запуск (песочница)

```bash
cd apps/api
cp .env.example .env            # заполнить JWT_ACCESS_SECRET
npx prisma migrate dev          # схема + seed Ивана Петрова
pnpm build && node dist/src/main.js   # :3000, статика ../mobile/dist
```

Демо-пользователь: **+79001234567 / qwerty123** (4 организации, 4 точки).

Сборка mobile с API (относительный URL, same-origin):

```bash
cd apps/mobile && EXPO_PUBLIC_API_URL=/api npx expo export --platform web
```

## БД

Демо — SQLite (`prisma/dev.db`, ADR 0008: Docker/PostgreSQL и ключи
Neon в песочнице недоступны). Для PostgreSQL/Neon: заменить
`DATABASE_URL` и провайдер в `prisma/schema.prisma`; enum'ы в схеме
эмулируются строками с проверкой в DTO.

## Тесты

```bash
pnpm --filter @bazar/api test         # unit (49)
pnpm --filter @bazar/api test:e2e     # e2e (16), SQLite test-e2e.db
```

## Безопасность

- Пароли — Argon2id (OWASP: 19 МБ / 2 итерации), хеши не покидают сервер.
- Access-JWT 15 минут; refresh — opaque, в БД только SHA-256-хеш.
- Повторное использование refresh отзывает всю семью сессий.
- Helmet, CORS, requestId в логах; пароли/токены/тела в логи не пишутся.
- Права проверяются на сервере (чужие организации — 404 без раскрытия).
