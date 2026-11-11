/**
 * JWT-стратегия (passport-jwt): Bearer access-токен, HS256.
 *
 * Payload минимален: { sub: userId }. Роли и членства проверяются
 * по БД на каждом защищённом запросе — права не доверяются токену.
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { loadEnv } from '../../config/env';

export interface AccessJwtPayload {
  sub: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: loadEnv().JWT_ACCESS_SECRET,
    });
  }

  validate(payload: AccessJwtPayload): { userId: string } {
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      throw new UnauthorizedException('Невалидный токен');
    }
    return { userId: payload.sub };
  }
}
