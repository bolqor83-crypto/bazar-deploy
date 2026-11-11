/**
 * Доменные типы Bazar.
 *
 * Модель контекста (User → Organization → Membership →
 * BusinessLocation → Role) — в context.ts, см. ADR 0003.
 * Модель аутентификации (AuthUser, Session, AuthState) — в auth.ts,
 * см. ADR 0004.
 * Модель онбординга (шаги, черновики, ошибки мок-сервиса) — в
 * onboarding.ts, см. ADR 0005.
 * Прочие бизнес-сущности будут добавлены в следующих промтах.
 */
export * from './context';
export * from './auth';
export * from './onboarding';
