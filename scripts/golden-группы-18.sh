#!/usr/bin/env bash
# Переснятие golden ПРОМТА 18 чанками по prep-зависимостям.
# Сервер API на :3000 должен работать (см. golden-server.sh).
# Чанки (порядок = порядок манифеста):
#   guest  — гостевые кадры + dev-logs (без БД-подготовок)
#   base   — каталог/товар/корзина/чек-аут/контекст (без заказов)
#   stock  — перевозчик + склад + инструменты (delivery+stock prep)
#   orders — заказы/маршрут/аналитика (delivery+market+analytics
#            prep; analytics-сдвиг дат ДО съёмка кадров списков —
#            состояние совпадает с монолитным прогоном CI)
cd /home/z/my-project/bazar || exit 1
GROUP=${1:?укажите группу: guest | base | stock | orders}

case "$GROUP" in
  guest)
    NAMES="login-light-390,login-dark-390,login-light-360,login-light-430,register-light-390,reset-request-light-390,dev-logs-light-390" ;;
  base)
    NAMES="catalog-light-390,catalog-light-360,catalog-light-430,catalog-dark-390,product-light-390,product-dark-390,cart-light-390,cart-dark-390,checkout-light-390,context-sheet-light-390,store-feed-light-390,wholesale-overview-light-390" ;;
  stock)
    NAMES="carrier-feed-light-390,carrier-feed-dark-390,carrier-my-deliveries-light-390,carrier-my-deliveries-dark-430,carrier-history-light-390,carrier-delivery-detail-light-390,carrier-delivery-detail-dark-390,stock-overview-light-390,stock-overview-dark-390,stock-overview-light-360,stock-overview-light-430,stock-overview-dark-430,stock-detail-light-390,stock-detail-dark-390,stock-movement-form-light-390,stock-transfer-form-light-390,stock-locations-light-390,tools-more-light-390,tools-more-dark-390" ;;
  orders)
    NAMES="orders-light-390,order-detail-light-390,order-with-delivery-light-390,order-with-delivery-dark-430,orders-grouped-dark-390,orders-collapsed-light-390,profile-customer-light-390,market-route-light-390,market-route-dark-390,market-route-light-360,market-route-light-430,market-route-visited-light-390,seller-orders-grouped-light-390,seller-analytics-light-390,seller-analytics-dark-390" ;;
  *) echo "неизвестная группа: $GROUP" >&2; exit 1 ;;
esac

echo "=== группа $GROUP (${NAMES//[,\n]/, }) ==="
VISUAL_ONLY="$NAMES" node scripts/update-golden.mjs
