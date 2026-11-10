/**
 * Модель аутентификации Bazar (см. ADR 0004).
 *
 * - AuthUser — публичные данные аккаунта (пароль сюда не входит).
 * - Session — псевдо-сессия мок-бэкенда: токен + сроки.
 * - AuthState — состояние стора: до проверки сессии «unknown».
 *
 * Пароль никогда не покидает экран ввода: в мок-хранилище лежит
 * только passwordHash (SHA-256 от пароля с индивидуальной солью).
 */
import type { Membership } from './context';

/** Публичные данные аутентифицированного пользователя. */
export interface AuthUser {
  id: string;
  /** Телефон в формате E.164, например +79001234567. */
  phone: string;
  name: string;
  createdAt: string;
  /** Членства в организациях (роль + организация). */
  memberships: Membership[];
}

/** Псевдо-сессия мок-бэкенда. Реальные JWT — Промт 6. */
export interface Session {
  userId: string;
  token: string;
  issuedAt: string;
  expiresAt: string;
}

/**
 * Состояние аутентификации:
 * - unknown — сессия ещё не проверена (сплэш/скелетон);
 * - authenticated — есть валидная сессия;
 * - unauthenticated — сессии нет или она истекла.
 */
export type AuthState = 'unknown' | 'authenticated' | 'unauthenticated';

/** Коды ошибок мок-бэкенда аутентификации. */
export type AuthErrorCode =
  | 'AUTH_INVALID_PHONE'
  | 'AUTH_INVALID_PASSWORD'
  | 'AUTH_USER_NOT_FOUND'
  | 'AUTH_USER_EXISTS'
  | 'AUTH_OTP_INVALID'
  | 'AUTH_OTP_EXPIRED'
  | 'AUTH_UNKNOWN';

/** Ошибка сервиса аутентификации с машинным кодом. */
export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}
