# Bazar

**Bazar** (ранее «АгроМолл») — цифровая торговая экосистема оптового и розничного аграрного рынка. Мобильное приложение объединяет четыре роли: обычного покупателя, покупателя из розничной точки, оптового продавца и доставщика. Проект создан с чистого листа; прежний прототип (v0.8.1) не используется и не переносится.

## Стек

- **Монорепо:** pnpm workspaces + Turborepo
- **Мобильное приложение:** Expo SDK 58 (managed) + React Native 0.88 + TypeScript (strict)
- **Навигация:** Expo Router (file-based, `src/app`)
- **Состояние:** Zustand (тема, контекст, тосты); **анимации:** Reanimated
- **Дизайн-система:** @bazar/ui — токены, темы light/dark/system, 12 компонентов
- **Тесты:** Jest 30 + jest-expo + @testing-library/react-native
- **Качество:** ESLint 9 (flat config) + Prettier + Husky + lint-staged + commitlint

## Запуск

```bash
pnpm install          # установка зависимостей
pnpm mobile           # Expo dev server (iOS/Android через Expo Go)
pnpm --filter mobile exec expo start --web   # web-версия (Expo web)
pnpm turbo lint typecheck test               # проверки качества
```

## Структура репозитория

```
apps/
  mobile/        # основное приложение: оболочка ролей, навигация, контекст (Промт 3)
  api/           # серверная часть — будет создана в следующих промтах
packages/
  ui/            # дизайн-система: токены, темы, 12 компонентов (Промт 2)
  types/         # доменные типы: модель контекста (Промт 3)
  validation/    # zod-схемы (заготовка)
  config/        # общие конфигурации (заготовка)
docs/
  adr/           # архитектурные решения (ADR, на русском)
  product/       # продуктовая документация (на русском)
secrets/         # секреты, не коммитятся (см. secrets/.gitignore)
.github/workflows/  # CI
```

## Документация

- Обзор продукта: [docs/product/00-overview.md](docs/product/00-overview.md)
- Архитектурные решения: [docs/adr/0001-стек-и-монорепо.md](docs/adr/0001-стек-и-монорепо.md)
- Правила проекта для агентов и контрибьюторов: [AGENTS.md](AGENTS.md)
