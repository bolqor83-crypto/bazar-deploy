/**
 * Параметры Argon2id (рекомендация OWASP для минимальной конфигурации):
 *   memoryCost = 19456 КБ (19 МБ), timeCost = 2, parallelism = 1.
 *
 * Хеш пароля — только на сервере; наружу не отдаётся, в логи не
 * попадает. Проверка — verify с теми же параметрами.
 */
import { hash, verify } from '@node-rs/argon2';

const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  return verify(passwordHash, password, ARGON2_OPTIONS);
}
