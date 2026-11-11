/**
 * Модуль аутентификации: контроллер, сервис, токены, OTP,
 * JWT-стратегия.
 */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppLogger } from '../common/app-logger';
import { loadEnv } from '../config/env';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      global: false,
      secret: loadEnv().JWT_ACCESS_SECRET,
      signOptions: {
        expiresIn: loadEnv().JWT_ACCESS_TTL_SEC,
        algorithm: 'HS256',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, OtpService, JwtStrategy, AppLogger],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
