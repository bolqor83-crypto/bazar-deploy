/**
 * Интерфейс SMS-провайдера (Промт 10, Часть A).
 *
 * Единственный контракт отправки: телефон + текст. Реализации:
 * ConsoleSmsProvider (dev), TwilioSmsProvider (production),
 * NotImplementedSmsProvider (нет конфигурации — явная ошибка).
 *
 * Выбор — env SMS_PROVIDER (sms.module.ts). OTP-код в аргументах
 * передаётся только сюда; провайдер не имеет права возвращать его
 * наружу (ответ API формирует AuthService отдельно, только devCode
 * в non-production).
 */
export interface SmsProvider {
  /** Отправить сообщение на телефон в формате E.164. */
  send(phone: string, message: string): Promise<void>;

  /** Название провайдера для /api/health (без секретов). */
  readonly name: 'console' | 'twilio' | 'none';
}
