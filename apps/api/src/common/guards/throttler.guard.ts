/**
 * Глобальный throttler-guard с выключателем для тестов.
 *
 * Лимиты: 5/мин на login/register/otp/reset, 30/мин на refresh,
 * 100/мин на остальные (переопределения @Throttle в контроллерах,
 * см. app.module). THROTTLER_DISABLED=true — только для e2e.
 *
 * 429 отдаётся в общем формате ошибок с кодом AUTH_RATE_LIMIT
 * и русским текстом.
 */
import { Injectable, type ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { loadEnv } from '../../config/env';
import { ApiError } from '../filters/api-error';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (loadEnv().THROTTLER_DISABLED) {
      return true;
    }
    return super.canActivate(context);
  }

  /** Русский текст и машинный код вместо дефолтного исключения. */
  protected async throwThrottlingException(): Promise<void> {
    throw new ApiError(
      429,
      'AUTH_RATE_LIMIT',
      'Слишком много попыток. Подождите минуту',
    );
  }
}
