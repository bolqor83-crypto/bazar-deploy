/**
 * Контроллер аутентификации: /api/auth/*.
 *
 * Rate limiting (Промт 10): login/register/password/reset —
 * 5 запросов в минуту на IP; otp/send — 10 в час на IP (плюс
 * 3/10 мин на номер в сервисе); otp/verify — 10/мин (3 попытки
 * ввода + запросы нового кода); refresh — 30 в минуту.
 */
import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import {
  ReqContext,
  type RequestContext,
} from './decorators/request-context.decorator';
import {
  LoginDto,
  LogoutDto,
  PasswordResetDto,
  RefreshDto,
  RegisterDto,
  SendOtpDto,
  VerifyOtpDto,
} from './dto/auth.dto';
import type { OtpPurpose } from './otp.service';

@ApiTags('Аутентификация')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  @HttpCode(200)
  @ApiOperation({ summary: 'Регистрация: телефон + пароль + имя' })
  register(@Body() dto: RegisterDto, @ReqContext() ctx: RequestContext) {
    return this.auth.register(dto, ctx);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Вход по паролю' })
  login(@Body() dto: LoginDto, @ReqContext() ctx: RequestContext) {
    return this.auth.login(dto, ctx);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Обновление пары токенов (ротация)' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Выход: отзыв сессии' })
  logout(@Body() dto: LogoutDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Профиль текущего пользователя с членствами' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user.userId);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @Post('otp/send')
  @HttpCode(200)
  @ApiOperation({ summary: 'Отправка OTP-кода (в dev код в ответе)' })
  sendOtp(@Body() dto: SendOtpDto) {
    const purpose: OtpPurpose = dto.purpose ?? 'login';
    return this.auth.sendOtp(dto.phone, purpose);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('otp/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Вход по OTP-коду' })
  verifyOtp(@Body() dto: VerifyOtpDto, @ReqContext() ctx: RequestContext) {
    return this.auth.verifyOtp(dto, ctx);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('password/reset')
  @HttpCode(200)
  @ApiOperation({ summary: 'Сброс пароля по OTP-коду' })
  resetPassword(
    @Body() dto: PasswordResetDto,
    @ReqContext() ctx: RequestContext,
  ) {
    return this.auth.resetPassword(dto, ctx);
  }
}
