/**
 * NotImplementedSmsProvider: SMS не настроены. Явная ошибка вместо
 * тихой потери кода — пользователь видит честное SMS_NOT_CONFIGURED.
 */
import { Injectable } from '@nestjs/common';
import { ApiError } from '../common/filters/api-error';
import type { SmsProvider } from './sms-provider.interface';

@Injectable()
export class NotImplementedSmsProvider implements SmsProvider {
  readonly name = 'none' as const;

  // Аргументы принимаются по контракту интерфейса и игнорируются.
  async send(_phone: string, _message: string): Promise<void> {
    throw new ApiError(
      503,
      'SMS_NOT_CONFIGURED',
      'SMS-провайдер не сконфигурирован',
    );
  }
}
