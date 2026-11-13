/**
 * ConsoleSmsProvider: SMS «в лог» (dev и демо без контракта с
 * оператором). Код виден в структурированном логе сервера —
 * и только там; ответ API отдаёт devCode лишь в non-production.
 */
import { Injectable } from '@nestjs/common';
import { AppLogger } from '../common/app-logger';
import type { SmsProvider } from './sms-provider.interface';

@Injectable()
export class ConsoleSmsProvider implements SmsProvider {
  readonly name = 'console' as const;

  constructor(private readonly logger: AppLogger) {}

  async send(phone: string, message: string): Promise<void> {
    this.logger.event('sms.console', {
      phoneMasked: phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4),
      length: message.length,
      message,
    });
  }
}
