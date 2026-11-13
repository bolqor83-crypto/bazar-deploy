/**
 * Сервис аутентификации (Промт 7).
 *
 * Пароли — Argon2id (OWASP: 19 МБ, 2 итерации). Access-JWT 15 минут,
 * refresh — opaque с семьёй и reuse detection (TokenService).
 *
 * Все критичные операции логируются с userId и requestId. Пароли,
 * хеши и токены в логи не попадают.
 */
import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppLogger } from '../common/app-logger';
import { ApiError } from '../common/filters/api-error';
import { toUserResponse } from '../common/mappers';
import { loadEnv } from '../config/env';
import { OtpService, type OtpPurpose } from './otp.service';
import { hashPassword, verifyPassword } from './password';
import { TokenService, type TokenPair } from './token.service';
import { SMS_PROVIDER } from '../sms/sms.module';
import { OtpSendRateLimiter } from '../sms/otp-send-rate-limiter.service';
import type { SmsProvider } from '../sms/sms-provider.interface';
import type { RequestContext } from './decorators/request-context.decorator';
import type {
  LoginDto,
  PasswordResetDto,
  RegisterDto,
  VerifyOtpDto,
} from './dto/auth.dto';

export interface AuthResult extends TokenPair {
  user: ReturnType<typeof toUserResponse>;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly otp: OtpService,
    private readonly logger: AppLogger,
    private readonly otpRateLimiter: OtpSendRateLimiter,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
  ) {}

  /** Членства с организациями и точками для ответа о пользователе. */
  private async userWithWorld(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ApiError(401, 'AUTH_UNAUTHORIZED', 'Пользователь не найден');
    }
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    });
    const orgIds = [...new Set(memberships.map((m) => m.organizationId))];
    const locations = orgIds.length
      ? await this.prisma.businessLocation.findMany({
          where: { organizationId: { in: orgIds } },
          orderBy: { createdAt: 'asc' },
        })
      : [];
    const locationsByOrg = new Map<string, typeof locations>();
    for (const loc of locations) {
      const bucket = locationsByOrg.get(loc.organizationId) ?? [];
      bucket.push(loc);
      locationsByOrg.set(loc.organizationId, bucket);
    }
    return toUserResponse({ ...user, memberships }, locationsByOrg);
  }

  /** Регистрация: новый пользователь, сессия, токены. */
  async register(dto: RegisterDto, ctx: RequestContext): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new ApiError(
        409,
        'AUTH_USER_EXISTS',
        'Этот номер уже зарегистрирован',
      );
    }

    const passwordHash = await hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        name: dto.name.trim(),
        passwordHash,
      },
    });

    const tokens = await this.tokens.createSession(user, ctx);
    this.logger.event('auth.register', { userId: user.id });
    return { user: await this.userWithWorld(user.id), ...tokens };
  }

  /** Вход по паролю. Неверный номер и неверный пароль — один ответ. */
  async login(dto: LoginDto, ctx: RequestContext): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (!user) {
      this.logger.warnEvent('auth.login.unknown_phone', {
        phoneMasked: maskPhone(dto.phone),
      });
      throw new ApiError(
        401,
        'AUTH_INVALID_CREDENTIALS',
        'Неверный номер или пароль',
      );
    }

    const valid = await verifyPassword(user.passwordHash, dto.password);
    if (!valid) {
      this.logger.warnEvent('auth.login.wrong_password', { userId: user.id });
      throw new ApiError(
        401,
        'AUTH_INVALID_CREDENTIALS',
        'Неверный номер или пароль',
      );
    }

    const tokens = await this.tokens.createSession(user, ctx);
    this.logger.event('auth.login', { userId: user.id });
    return { user: await this.userWithWorld(user.id), ...tokens };
  }

  /**
   * Обновление пары токенов. Ротация внутри семьи; повторное
   * использование отозванного токена отзывает всю семью (401).
   */
  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokens = await this.tokens.rotate(refreshToken);
    this.logger.event('auth.refresh', { token: 'rotated' });
    return tokens;
  }

  /** Выход: отзыв сессии по refresh-токену. Идемпотентен. */
  async logout(refreshToken: string): Promise<void> {
    await this.tokens.revoke(refreshToken);
    this.logger.event('auth.logout', { token: 'revoked' });
  }

  /** Профиль текущего пользователя (по access-JWT). */
  async me(userId: string): Promise<ReturnType<typeof toUserResponse>> {
    return this.userWithWorld(userId);
  }

  /**
   * Отправка OTP через SmsProvider (Промт 10). Rate limit:
   * 3/10 мин на номер (OtpSendRateLimiter) + 10/час на IP
   * (декоратор маршрута). В dev-режиме код возвращается в ответе —
   * демо без контракта с оператором. В production — { sent: true }.
   */
  async sendOtp(
    phone: string,
    purpose: OtpPurpose,
  ): Promise<{ sent: true; devCode?: string }> {
    this.otpRateLimiter.checkAndCount(phone);
    const code = this.otp.issue(phone, purpose);
    const isProduction = loadEnv().NODE_ENV === 'production';
    // SMS уходит всегда; сбой доставки — честная 502, код не выдан.
    await this.sms.send(
      phone,
      `Bazar: код подтверждения ${code}. Действителен 5 минут.`,
    );
    this.logger.event('auth.otp_send', {
      phoneMasked: maskPhone(phone),
      purpose,
      provider: this.sms.name,
    });
    // devCode — только с console-провайдером вне production:
    // реальная доставка не даёт кода наружу.
    if (isProduction || this.sms.name !== 'console') {
      return { sent: true };
    }
    return { sent: true, devCode: code };
  }

  /**
   * Вход по коду. Пользователя без аккаунта создаём (роль CUSTOMER,
   * вход по паролю невозможен — случайный хеш), как в моках Промта 3.
   */
  async verifyOtp(dto: VerifyOtpDto, ctx: RequestContext): Promise<AuthResult> {
    this.otp.verify(dto.phone, 'login', dto.code);

    let user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: dto.phone,
          name: `Пользователь ${maskPhone(dto.phone)}`,
          // Случайный секрет: парольный вход для OTP-аккаунта закрыт.
          passwordHash: await hashPassword(randomSecret()),
        },
      });
      this.logger.event('auth.otp_user_created', { userId: user.id });
    }

    const tokens = await this.tokens.createSession(user, ctx);
    this.logger.event('auth.otp_login', { userId: user.id });
    return { user: await this.userWithWorld(user.id), ...tokens };
  }

  /**
   * Сброс пароля по коду. После смены все сессии отзываются.
   * (Эндпоинт сверх списка Промта 7: сохраняет существующий экран
   * восстановления пароля mobile — решение зафиксировано в ADR 0008.)
   */
  async resetPassword(
    dto: PasswordResetDto,
    ctx: RequestContext,
  ): Promise<AuthResult> {
    this.otp.verify(dto.phone, 'password_reset', dto.code);

    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (!user) {
      throw new ApiError(404, 'AUTH_USER_NOT_FOUND', 'Пользователь не найден');
    }

    const passwordHash = await hashPassword(dto.newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    // Смена пароля — все прежние сессии недействительны.
    await this.tokens.revokeAllForUser(user.id);

    const tokens = await this.tokens.createSession(
      { ...user, passwordHash },
      ctx,
    );
    this.logger.event('auth.password_reset', { userId: user.id });
    return { user: await this.userWithWorld(user.id), ...tokens };
  }
}

/** Маскированный телефон для логов: +7901••••67. */
function maskPhone(phone: string): string {
  if (phone.length < 6) {
    return '***';
  }
  return `${phone.slice(0, 4)}•••••${phone.slice(-2)}`;
}

function randomSecret(): string {
  return `${Math.random().toString(36)}${Date.now().toString(36)}`;
}
