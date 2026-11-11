/**
 * Структурированные логи (pino, Промт 7).
 *
 * JSON в stdout: удобно собирать и фильтровать. События
 * аутентификации и организаций логируются с userId и requestId
 * (requestId подставляется из AsyncLocalStorage-контекста).
 *
 * Пароли, токены и хеши в логи не попадают никогда: сюда передаются
 * только идентификаторы и статусы операций.
 */
import { Injectable, Logger } from '@nestjs/common';
import pino from 'pino';
import { getRequestId } from './request-context';

/** Уровень по NODE_ENV: в тестах тише, чтобы не засорять вывод. */
function levelForEnv(): pino.LevelWithSilent {
  const env = process.env.NODE_ENV ?? 'development';
  if (env === 'test') {
    return 'silent';
  }
  if (env === 'production') {
    return 'info';
  }
  return 'debug';
}

@Injectable()
export class AppLogger extends Logger {
  private readonly pinoInstance = pino({
    level: levelForEnv(),
    base: undefined, // без pid/hostname — компактнее
    timestamp: pino.stdTimeFunctions.isoTime,
  });

  /** Событие с полями: requestId добавляется из контекста запроса. */
  event(name: string, fields: Record<string, unknown> = {}): void {
    const requestId = getRequestId();
    this.pinoInstance.info(
      { ...fields, ...(requestId ? { requestId } : {}) },
      name,
    );
  }

  /** Предупреждение с полями. */
  warnEvent(name: string, fields: Record<string, unknown> = {}): void {
    const requestId = getRequestId();
    this.pinoInstance.warn(
      { ...fields, ...(requestId ? { requestId } : {}) },
      name,
    );
  }

  /** Ошибка с полями. */
  errorEvent(name: string, fields: Record<string, unknown> = {}): void {
    const requestId = getRequestId();
    this.pinoInstance.error(
      { ...fields, ...(requestId ? { requestId } : {}) },
      name,
    );
  }
}
