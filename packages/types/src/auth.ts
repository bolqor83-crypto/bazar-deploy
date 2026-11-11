/**
 * Модель аутентификации Bazar (см. ADR 0004, обновление — Промт 7).
 *
 * - AuthUser — публичные данные аккаунта (пароль сюда не входит).
 * - Tokens — пара реального API: access-JWT (в памяти) + refresh
 *   (AsyncStorage, Промт 8 — SecureStore).
 * - AuthState — состояние стора: до проверки сессии «unknown».
 *
 * Пароль никогда не покидает экран ввода: на сервере — Argon2id.
 */
import type { BusinessLocation, Membership, Organization } from './context';

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

/** Пара токенов реального API (Промт 7). */
export interface Tokens {
  /** Access-JWT, HS256, TTL 15 минут. Хранится только в памяти. */
  accessToken: string;
  /** Opaque refresh-токен, TTL 30 дней. Хранится в AsyncStorage. */
  refreshToken: string;
}

/**
 * «Снимок мира» пользователя: членства + организации + точки.
 * Источник — реальный API (GET /api/auth/me); локальный онбординг
 * (Промт 6, моки) подмешивается поверх до миграции в Промт 8.
 */
export interface WorldSnapshot {
  memberships: Membership[];
  organizations: Organization[];
  locations: BusinessLocation[];
}

/**
 * Состояние аутентификации:
 * - unknown — сессия ещё не проверена (сплэш/скелетон);
 * - authenticated — есть валидная сессия;
 * - unauthenticated — сессии нет или она истекла.
 */
export type AuthState = 'unknown' | 'authenticated' | 'unauthenticated';

/** Коды ошибок API аутентификации (маппятся в русские тексты на клиенте). */
export type AuthErrorCode =
  | 'AUTH_INVALID_PHONE'
  | 'AUTH_INVALID_PASSWORD'
  /** Единый код неверного номера/пароля: не раскрываем, что именно. */
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_USER_NOT_FOUND'
  | 'AUTH_USER_EXISTS'
  | 'AUTH_OTP_INVALID'
  | 'AUTH_OTP_EXPIRED'
  /** Access-токен отсутствует/невалиден (401 до авторизации). */
  | 'AUTH_UNAUTHORIZED'
  /** Refresh-токен невалиден/отозван (reuse detection) — нужен логин. */
  | 'AUTH_SESSION_EXPIRED'
  | 'AUTH_RATE_LIMIT'
  | 'AUTH_UNKNOWN'
  /** Сеть: API недоступен или таймаут. */
  | 'NETWORK_ERROR';

/** Ошибка клиента API с машинным кодом. */
export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}
