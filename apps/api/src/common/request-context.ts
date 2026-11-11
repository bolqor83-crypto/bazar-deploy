/**
 * Контекст запроса: requestId через AsyncLocalStorage.
 *
 * Middleware назначает каждому HTTP-запросу идентификатор и кладёт
 * его в асинхронное хранилище — любой сервис может дописать
 * requestId в структурированный лог без пробросов через аргументы.
 * (Требование Промта 7: критичные операции — с userId и requestId.)
 */
import { AsyncLocalStorage } from 'node:async_hooks';

const storage = new AsyncLocalStorage<string>();

/** Идентификатор текущего запроса или null вне запроса. */
export function getRequestId(): string | null {
  return storage.getStore() ?? null;
}

/** Выполняет колбэк в контексте requestId. */
export function runWithRequestId<T>(requestId: string, fn: () => T): T {
  return storage.run(requestId, fn);
}
