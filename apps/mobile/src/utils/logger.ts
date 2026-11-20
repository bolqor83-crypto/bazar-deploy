/**
 * Logger мобильного приложения (Промт 18, Часть A).
 *
 * Ring-buffer на 100 записей в памяти:
 * - error — в буфер + console.error + тост с кнопкой «Скопировать
 *   лог» (копирует весь буфер; нажатие закрепляет тост);
 * - warn — в буфер + console.warn, без тоста;
 * - info — только в dev-сборках (__DEV__).
 *
 * Никогда не логировать: пароли, коды OTP, refresh-токены, полные
 * номера телефонов (маскировать на стороне отправителя — сюда
 * попадают только идентификаторы и статусы).
 */
import { useToastStore } from '@bazar/ui';
import { copyTextToClipboard } from './clipboard';

export type LogLevel = 'error' | 'warn' | 'info';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  requestId?: string;
  userId?: string;
  screen?: string;
  action: string;
  message: string;
  context?: Record<string, unknown>;
}

const MAX_SIZE = 100;

/** Контекст, проставляемый каждой записи (user, экран). */
let stampContext: { userId?: string; screen?: string } = {};

const buffer: LogEntry[] = [];

function push(entry: LogEntry): void {
  buffer.push(entry);
  if (buffer.length > MAX_SIZE) {
    buffer.shift();
  }
}

function makeEntry(
  level: LogLevel,
  action: string,
  message: string,
  context?: Record<string, unknown>,
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    action,
    message,
    context,
    ...stampContext,
  };
}

/** Тост об ошибке с копированием лога (одна очередь тостов). */
function showErrorToast(): void {
  useToastStore.getState().show({
    variant: 'error',
    message: 'Ошибка',
    action: {
      label: 'Скопировать лог',
      run: () => {
        void logger.copyToClipboard();
      },
    },
  });
}

export const logger = {
  error(
    action: string,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    push(makeEntry('error', action, message, context));

    console.error('[ERROR]', action, message);
    showErrorToast();
  },

  warn(
    action: string,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    push(makeEntry('warn', action, message, context));

    console.warn('[WARN]', action, message);
  },

  info(
    action: string,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    if (!__DEV__) {
      return;
    }
    push(makeEntry('info', action, message, context));
    // eslint-disable-next-line no-console -- контракт логгера
    console.info('[INFO]', action, message);
  },

  /** Снимок буфера (новый массив — безопасно отдавать наружу). */
  getBuffer: (): LogEntry[] => [...buffer],

  /** Очистить буфер (dev-экран). */
  clear(): void {
    buffer.length = 0;
  },

  /** Проставить userId/screen будущим записям (вызывают сторы). */
  setContext(context: { userId?: string; screen?: string }): void {
    stampContext = { ...stampContext, ...context };
  },

  /** Копирует весь буфер в clipboard как JSON. true — удалось. */
  async copyToClipboard(): Promise<boolean> {
    return copyTextToClipboard(JSON.stringify(logger.getBuffer(), null, 2));
  },
};
