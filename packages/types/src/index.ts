/**
 * Доменные типы Bazar.
 *
 * Модель контекста (User → Organization → Membership →
 * BusinessLocation → Role) — в context.ts, см. ADR 0003.
 * Модель аутентификации (AuthUser, Session, AuthState) — в auth.ts,
 * см. ADR 0004.
 * Модель онбординга (шаги, черновики, ошибки мок-сервиса) — в
 * onboarding.ts, см. ADR 0005.
 * Модель каталога (категории, товары, предложения) — в catalog.ts,
 * см. ADR 0009 (Промт 8).
 * Корзина (CartItem, CartView) — в cart.ts, см. ADR 0010 (Промт 9).
 * Заказы (Order, OrderItem, OrderEvent) — в order.ts, см. ADR 0010.
 */
export * from './context';
export * from './auth';
export * from './onboarding';
export * from './catalog';
export * from './cart';
export * from './order';
