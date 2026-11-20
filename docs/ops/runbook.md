# Runbook — эксплуатация Bazar

Прод: https://bazar-wdux.onrender.com · Репо:
`bolqor83-crypto/bazar` (основной) + `bolqor83-crypto/bazar-deploy`
(зеркало, на него смотрит Render).

## Деплой

1. Коммит в `main` основного репо (внутри песочницы — ветка
   `development`, пушится в `main`):
   ```bash
   git push origin development:main
   ```
2. Синхронизировать зеркало (Render собирает его):
   ```bash
   git push mirror development:main
   ```
3. CI на основном репо (GitHub Actions «Проверка качества»):
   lint+typecheck+test → pixelmatch golden → e2e (Neon bazar_test)
   → деплой на Render (джоба пушит в зеркало и дёргает Render API).
4. Проверить выкладку:
   ```bash
   curl -s https://bazar-wdux.onrender.com/api/health
   # {"status":"ok","db":"ok",...,"version":"<SHA>"}
   ```
   `version` должен совпасть с SHA последнего коммита.
5. Прод free-tier засыпает: первый запрос до ~90 с — пробуждать
   с таймаутом и до 3 попыток.

Ручной trigger деплоя (если CI недоступен):

```bash
curl -X POST "https://api.render.com/v1/services/<svc-id>/deploys" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" -d '{}'
```

## Откат

```bash
git revert <плохой-SHA>            # обратный коммит
git push origin development:main   # CI прогонит и задеплоит
git push mirror development:main
```

Откат через «redeploy старого коммита» в Render-панели не
использовать: зеркало и основной репо разойдутся (см. урок
Промта 16 — версия на /api/health обязана равняться HEAD).

## Восстановление БД из снапшота Neon

1. Панель Neon → проект `bazar-demo` → **Backups** (ветка main).
2. Restore в новую ветку (Neon создаёт ветку на момент снапшота;
   instant, копирование не требуется).
3. Перенести данные: экспорт/импорт таблиц через SQL-дамп между
   ветками, либо переключить `DATABASE_URL` в Render env на
   восстановленную ветку и проверить приложение.
4. Сменить строки подключения в Render (Settings → Environment)
   и сделать redeploy.
5. Проверить: `/api/health` → `db: ok`; каталог отдаёт товары.

## Падение CI

1. Открыть прогон: GitHub → Actions → «Проверка качества».
2. **e2e красные, unit зелёные** — чаще всего гонка ранов на
   общей БД `bazar_test` (уже частично закрыто concurrency
   cancel-in-progress, Промт 16 C): проверить, что не запущено
   два рана одного ref, перезапустить прогон.
3. **pixelmatch красный** — смотреть артефакт `pixelmatch-diff`
   в прогоне: какие кадры и % расхождения. Обычно это
   неснятые golden после изменений экранов → локально
   `pnpm golden:update`, сверить кадры глазами, закоммитить.
4. **Секреты**: в прогоне «Не удалось авторизоваться» — проверить
   NEON__/RENDER__ в Settings → Secrets (без вывода значений).
5. Транзиентные 500 от Neon (free tier): retry прогона; в CI
   pixelmatch уже делает retry prepare.

## Транзиентные 500 от Neon

- Free-tier compute засыпает/рестартует: единичные 500 в e2e —
  рантайм-шум. Retry джобы (Re-run failed jobs).
- Если воспроизводимо: проверить health ветки в панели Neon,
  `prisma migrate deploy` вручную (см. troubleshooting.md),
  посмотреть логи Render (stdout: pino JSON, поле `duration_ms`
  и `status` покажут медленные запросы).

## Логи прода

Render → сервис `bazar` → Logs. Формат — pino JSON:
HTTP-запросы (`action`, `status`, `duration_ms`, `requestId`,
`userId`) и события сервисов (`auth.login`, `order.created`,
`stock.movement`). Тел и заголовков в логах нет.
