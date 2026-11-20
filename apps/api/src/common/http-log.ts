/**
 * HTTP-лог (Промт 18, Часть A): pino-инстанс и извлечение userId.
 *
 * userId достаётся из заголовка Authorization (JWT payload, БЕЗ
 * верификации — значение только для логов, аутентификацию делают
 * guard'ы). Значение defensively ограничено: не может выполнить код
 * и не содержит пароли — payload JWT это sub/phone/role.
 */
import pino from 'pino';

/** Логгер HTTP-запросов: те же настройки, что у AppLogger. */
export const httpLogger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});

/** Длина ограничена — в лог не пишем ничего длиннее идентификатора. */
const MAX_USER_ID_LENGTH = 64;

/**
 * userId из Authorization: Bearer <jwt> (payload.sub) или null.
 * Ошибки парсинга глотаются: битый токен — не повод падать логам.
 */
export function userIdFromAuthHeader(
  headers?: Record<string, unknown>,
): string | null {
  const header = headers?.authorization ?? headers?.Authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
    return null;
  }
  const token = header.slice('Bearer '.length).trim();
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    // base64url → base64 с добивкой до кратности 4.
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const payload = JSON.parse(
      Buffer.from(base64, 'base64').toString('utf-8'),
    ) as { sub?: unknown };
    if (
      typeof payload.sub === 'string' &&
      payload.sub.length > 0 &&
      payload.sub.length <= MAX_USER_ID_LENGTH
    ) {
      return payload.sub;
    }
    return null;
  } catch {
    return null;
  }
}
