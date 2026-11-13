/**
 * SMS-модуль (Промт 10, Часть A).
 *
 * Провайдер выбирается env SMS_PROVIDER:
 * - console (по умолчанию в dev/test) — лог сервера;
 * - twilio — REST API Twilio, кредиты из env TWILIO_*;
 * - none — NotImplementedSmsProvider (503 SMS_NOT_CONFIGURED).
 *
 * Глобальный модуль: AuthService и HealthModule используют
 * SMS_PROVIDER без повторного импорта.
 */
import { Global, Module } from '@nestjs/common';
import { AppLogger } from '../common/app-logger';
import { ConsoleSmsProvider } from './console-sms.provider';
import { TwilioSmsProvider } from './twilio-sms.provider';
import { NotImplementedSmsProvider } from './not-implemented-sms.provider';
import { OtpSendRateLimiter } from './otp-send-rate-limiter.service';
import type { SmsProvider } from './sms-provider.interface';

export const SMS_PROVIDER = 'SMS_PROVIDER_TOKEN';

function pickProvider(): SmsProvider {
  const requested = (process.env.SMS_PROVIDER ?? '').trim().toLowerCase();
  const logger = new AppLogger();
  if (requested === 'twilio') {
    return new TwilioSmsProvider();
  }
  if (requested === 'none') {
    return new NotImplementedSmsProvider();
  }
  return new ConsoleSmsProvider(logger);
}

@Global()
@Module({
  providers: [
    OtpSendRateLimiter,
    {
      provide: SMS_PROVIDER,
      useFactory: pickProvider,
    },
  ],
  exports: [SMS_PROVIDER, OtpSendRateLimiter],
})
export class SmsModule {}
