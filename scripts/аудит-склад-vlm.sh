#!/usr/bin/env bash
# VLM-аудит складских экранов Промта 11b после правок (медиана 3).
# Каждому экрану — 2 кадра: основной + состояние (критерий states).
set -u
AUD_DIR="/home/z/my-project/work/bazar-clone/download/промт11b/audit"
OUT_DIR="/home/z/my-project/work/bazar-clone/download/промт11b/audit-after"
mkdir -p "$OUT_DIR"

PROMPT='Ты строгий аудитор визуального дизайна мобильных приложений. Перед тобой ДВА кадра ОДНОГО экрана склада B2B-приложения (React Native, светлая тема, 390): основной вид и дополнительное состояние. Позиционирование: Stripe / Linear / Shopify admin — рабочий инструмент профессионала, не «дешёвый маркетплейс» и не ERP.

Оцени по 10 критериям, каждый 0-10 (состояния оценивай по обоим кадрам):
1. hierarchy — иерархия: главное видно сразу
2. typography — типографика, контраст, tabular-nums
3. color — спокойная палитра, без красного (терракота ок)
4. grid — сетка, выравнивание, отступы
5. components — целостность карточек/полей/кнопок
6. icons — уместность и единый стиль
7. states — пустые состояния, подсказки, ошибки, disabled-состояния
8. density — рабочая плотность (64-72px), не пустота
9. a11y — зоны нажатия >=48px, читабельность
10. impression — впечатление профессионального продукта

Ответь СТРОГО одной строкой JSON без markdown:
{"hierarchy":N,"typography":N,"color":N,"grid":N,"components":N,"icons":N,"states":N,"density":N,"a11y":N,"impression":N,"total":N,"notes":"1-2 главные проблемы на русском"}'

declare -A MAIN=(
  [overview]="$AUD_DIR/screen-overview.png"
  [detail]="$AUD_DIR/screen-detail.png"
  [movement]="$AUD_DIR/screen-movement.png"
  [transfer]="$AUD_DIR/screen-transfer.png"
)
declare -A STATE=(
  [overview]="$AUD_DIR/screen-overview-2.png"
  [detail]="$AUD_DIR/screen-detail-2.png"
  [movement]="$AUD_DIR/screen-movement-2.png"
  [transfer]="$AUD_DIR/screen-transfer-2.png"
)

for name in overview detail movement transfer; do
  for run in 1 2 3; do
    echo "аудит: $name прогон $run"
    z-ai vision -p "$PROMPT" -i "${MAIN[$name]}" -i "${STATE[$name]}" -o "$OUT_DIR/${name}-run${run}.json" 2>/dev/null || echo "  ошибка"
    sleep 1
  done
done
echo "=== аудит снят ==="