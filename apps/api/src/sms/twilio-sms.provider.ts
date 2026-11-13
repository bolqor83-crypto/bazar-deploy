/**
 * TwilioSmsProvider: отправка через REST API Twilio (Промт 10).
 *
 * Без пакета twilio — один POST c Basic-auth (Node 20 fetch),
 * меньше зависимостей. Учётные данные — только из env:
 * TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER.
 *
 * Ошибка сети/провайдера — ApiError 502 SMS_SEND_FAILED: вызывающая
 * сторона (Auth) не выдаёт OTP-код пользователю при сбое доставки.
 */
import { Injectable } from '@nestjs/common';
import { loadEnv } from '../config/env';
import { ApiError } from '../common/filters/api-error';
import type { SmsProvider } from './sms-provider.interface';

const TWILIO_API = 'https://api.twilio.com/2010-04-01/Accounts';

@Injectable()
export class TwilioSmsProvider implements SmsProvider {
  readonly name = 'twilio' as const;

  async send(phone: string, message: string): Promise<void> {
    const env = loadEnv();
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = env;
    if (
      !TWILIO_ACCOUNT_SID ||
      !TWILIO_AUTH_TOKEN ||
      !TWILIO_FROM_NUMBER
    ) {
      throw new ApiError(
        503,
        'SMS_NOT_CONFIGURED',
        'SMS-провайдер не сконфигурирован',
      );
    }
    const auth = Buffer.from(
      `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`,
    ).toString('base64');
    let response: Response;
    try {
      response = await fetch(
        `${TWILIO_API}/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: phone,
            From: TWILIO_FROM_NUMBER,
            Body: message,
          }).toString(),
          signal: AbortSignal.timeout(10_000),
        },
      );
    } catch {
      throw new ApiError(
        502,
        'SMS_SEND_FAILED',
        'SMS-провайдер недоступен',
      );
    }
    if (!response.ok) {
      throw new ApiError(
        502,
        'SMS_SEND_FAILED',
        'SMS-провайдер отклонил отправку',
      );
    }
  }
}
