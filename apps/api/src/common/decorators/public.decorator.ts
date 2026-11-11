/**
 * Декоратор @Public(): маршрут без аутентификации.
 *
 * JwtAuthGuard глобальный (APP_GUARD); публичные маршруты —
 * login, register, refresh, otp, health, docs — помечаются явно.
 */
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
