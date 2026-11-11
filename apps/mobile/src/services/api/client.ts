/**
 * HTTP-клиент API Bazar (Промт 7, Часть D).
 *
 * База — EXPO_PUBLIC_API_URL (при сборке — относительный /api:
 * NestJS отдаёт и API, и статику mobile на одном порту).
 *
 * Access-токен живёт только в памяти этого модуля (не в
 * AsyncStorage): утечка персистентного файла не даёт доступ к API.
 * Refresh-токен хранится в AsyncStorage (SecureStore — Промт 8).
 *
 * Автоматический refresh при 401: один раз на запрос; неудача —
 * сессия считается истёкшей, вызывается зарегистрированный
 * обработчик (authStore выполняет logout).
 *
 * Таймаут 15 секунд: слабый сигнал — операционный сценарий проекта.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthError, type AuthErrorCode } from '@bazar/types';

/** Ключ refresh-токена в AsyncStorage. */
export const REFRESH_TOKEN_KEY = 'bazar.auth.refresh';

const TIMEOUT_MS = 15_000;

/** База API: относительный /api для web-сборки с тем же origin. */
export const API_BASE_URL: string = process.env.EXPO_PUBLIC_API_URL || '/api';

/** Access-токен — только в памяти. */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** Обработчик безнадёжной сессии (refresh не удался). */
type SessionExpiredHandler = () => Promise<void> | void;
let sessionExpiredHandler: SessionExpiredHandler | null = null;

export function setSessionExpiredHandler(
  handler: SessionExpiredHandler | null,
): void {
  sessionExpiredHandler = handler;
}

/** Refresh-токен — персистентный (восстановление сессии). */
export async function getRefreshToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setRefreshToken(token: string | null): Promise<void> {
  try {
    if (token === null) {
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    } else {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
    }
  } catch {
    // Хранилище недоступно: сессия просто не переживёт перезапуск.
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** Требуется Authorization (по умолчанию — да). */
  auth?: boolean;
  /** Внутренний флаг: запрос уже повторяется после refresh. */
  _retried?: boolean;
}

/** Ответ API c ошибкой. */
interface ApiErrorBody {
  code?: string;
  message?: string | string[];
}

function toAuthCode(code: string | undefined): AuthErrorCode {
  const known: AuthErrorCode[] = [
    'AUTH_INVALID_PHONE',
    'AUTH_INVALID_PASSWORD',
    'AUTH_INVALID_CREDENTIALS',
    'AUTH_USER_NOT_FOUND',
    'AUTH_USER_EXISTS',
    'AUTH_OTP_INVALID',
    'AUTH_OTP_EXPIRED',
    'AUTH_SESSION_EXPIRED',
    'AUTH_RATE_LIMIT',
    'AUTH_UNAUTHORIZED',
  ];
  return known.includes(code as AuthErrorCode)
    ? (code as AuthErrorCode)
    : 'AUTH_UNKNOWN';
}

/** Один HTTP-запрос с таймаутом. */
async function fetchWithTimeout(
  path: string,
  options: RequestOptions,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.auth !== false && accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : {}),
      },
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Запрос к API. 401 → одна попытка refresh → повтор. Сетевые ошибки
 * и таймауты — NETWORK_ERROR («Сервер временно недоступен»).
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetchWithTimeout(path, options);
  } catch {
    throw new AuthError('NETWORK_ERROR', 'Сервер временно недоступен');
  }

  if (response.status === 401 && !options._retried && options.auth !== false) {
    // Просрочен access: пробуем refresh и повторяем запрос один раз.
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, _retried: true });
    }
    await setRefreshToken(null);
    void Promise.resolve(sessionExpiredHandler?.()).catch(() => undefined);
    throw new AuthError('AUTH_SESSION_EXPIRED', 'Сессия истекла');
  }

  if (!response.ok) {
    let code: string | undefined;
    try {
      const body = (await response.json()) as ApiErrorBody;
      code = typeof body.code === 'string' ? body.code : undefined;
    } catch {
      // Ответ без JSON — код останется AUTH_UNKNOWN.
    }
    throw new AuthError(toAuthCode(code), 'Ошибка запроса');
  }

  return (await response.json()) as T;
}

/**
 * Ротация refresh-токена. Используется и при авто-refresh при 401,
 * и при восстановлении сессии (hydrate).
 */
export async function tryRefresh(): Promise<boolean> {
  const refresh = await getRefreshToken();
  if (!refresh) {
    return false;
  }
  try {
    const response = await fetchWithTimeout('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: refresh },
      auth: false,
    });
    if (!response.ok) {
      await setRefreshToken(null);
      return false;
    }
    const tokens = (await response.json()) as {
      accessToken: string;
      refreshToken: string;
    };
    accessToken = tokens.accessToken;
    await setRefreshToken(tokens.refreshToken);
    return true;
  } catch {
    // Сетевая ошибка: refresh остаётся, сессию не убиваем.
    return false;
  }
}

/** Живость API для graceful degradation (health-check). */
export async function pingApi(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout('/health', { auth: false });
    const body = (await response.json()) as { status?: string };
    return response.ok && body.status === 'ok';
  } catch {
    return false;
  }
}

/** Полная очистка токенов клиента (logout). */
export function clearTokens(): void {
  accessToken = null;
}
