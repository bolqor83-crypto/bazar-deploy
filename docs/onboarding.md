# Onboarding — новый разработчик за 30 минут

Цель: от клона до работающего локально приложения с зелёными
тестами — полчаса.

## 0. Предварительно

- Node.js 24+, pnpm 9 (`npm i -g pnpm@9`), git.
- Доступ к репо `bolqor83-crypto/bazar` (GitHub).
- Секреты для локальной БД — у владельца (Neon URI,
  `secrets/.env.local`; значения не печатать и не коммитить).

## 1. Клонировать и установить (≈1 мин)

```bash
git clone https://github.com/bolqor83-crypto/bazar.git
cd bazar
pnpm install --frozen-lockfile
```

## 2. Настроить окружение API (≈2 мин)

```bash
cd apps/api
cp .env.example .env
# заполнить: DATABASE_URL_POOLED / DATABASE_URL_DIRECT (Neon),
# JWT_ACCESS_SECRET — любая случайная строка ≥ 32 символов
```

## 3. Миграции (≈1 мин)

```bash
npx prisma migrate deploy   # схема; для демо-данных — migrate dev
```

## 4. Проверить качество (≈8 мин)

```bash
cd ../..
pnpm turbo lint typecheck test --concurrency=2
# 16/16 задач, все unit-тесты зелёные
```

## 5. Поднять backend + mobile (≈5 мин)

```bash
# статика приложения
cd apps/mobile && EXPO_PUBLIC_API_URL=/api npx expo export --platform web
# API + статика на одном порту
cd ../api && pnpm build && PORT=3000 MOBILE_DIST_PATH=../mobile/dist node dist/src/main.js
```

## 6. Открыть (≈1 мин)

- http://localhost:3000 — приложение (редирект на /login).
- http://localhost:3000/api/health — `{"status":"ok","db":"ok",...}`.
- http://localhost:3000/api/docs — Swagger.
- Демо-вход: **+79001234567 / qwerty123** (4 роли, 4 организации).
- Диагностика: http://localhost:3000/dev/logs.

## 7. Ориентироваться (≈10 мин)

- [AGENTS.md](../AGENTS.md) — правила проекта: стек, паттерны,
  запреты (красный цвет, спиннеры, console.log, any), Definition
  of Done каждого промта.
- [docs/adr/](adr/) — все архитектурные решения с контекстом
  (почему так): начать с 0001 и 0008.
- `apps/api/README.md`, `apps/mobile/README.md`,
  `packages/ui/README.md`, `packages/types/README.md` — модули.
- [docs/ops/runbook.md](ops/runbook.md) — деплой/откат.

## Частые вопросы

- **Где БД?** PostgreSQL в Neon (проект `bazar-demo`): демо-база
  `neondb`, тестовая `bazar_test`. SQLite из старых ADR больше не
  используется (Промт 9).
- **Почему e2e гонять чанками?** Лимит времени CI/песочницы;
  наборы самодостаточны, порядок не важен.
- **Как добавить экран?** Файл-маршрут в `apps/mobile/src/app`,
  логика — в `components/screens/`, данные — `services/api/`,
  типы — `packages/types`. Тест — рядом с экраном.
- **Коммиты** — Conventional Commits на русском:
  `feat(market): ...`, `fix(ui): ...`, `chore(docs): ...`.
