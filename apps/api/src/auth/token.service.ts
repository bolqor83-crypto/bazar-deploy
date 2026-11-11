/**
 * Токены доступа (Промт 7).
 *
 * Access — JWT HS256, TTL 15 минут, payload { sub: userId }.
 * Refresh — opaque: 32 случайных байта в base64url. В БД хранится
 * только SHA-256-хеш; токен целиком возвращается клиенту один раз.
 *
 * Refresh-token family: при входе создаётся новая семья (UUID);
 * при обновлении старая запись отзывается, новая создаётся в той же
 * семье. Повторное использование отозванного токена — компрометация:
 * отзывается вся семья (reuse detection).
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Session, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ApiError } from '../common/filters/api-error';
import { loadEnv } from '../config/env';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** SHA-256 от refresh-токена — ключ поиска в БД. */
function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Подписывает access-JWT для пользователя. */
  issueAccessToken(userId: string): string {
    return this.jwt.sign({ sub: userId });
  }

  /**
   * Создаёт новую сессию: свежая семья, refresh-токен хранится
   * хешированным. Вызывается при login/register/otp-verify.
   */
  async createSession(
    user: User,
    context: { userAgent?: string; ip?: string } = {},
  ): Promise<TokenPair> {
    const env = loadEnv();
    const refreshToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + env.REFRESH_TTL_SEC * 1000);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshHash: sha256(refreshToken),
        family: randomUUID(),
        expiresAt,
        userAgent: context.userAgent ?? null,
        ip: context.ip ?? null,
      },
    });

    return {
      accessToken: this.issueAccessToken(user.id),
      refreshToken,
    };
  }

  /**
   * Ротация refresh-токена внутри семьи.
   *
   * Токен ищется по хешу. Не найден/истёк — 401. Отозван —
   * повторное использование: отзываем всю семью и всех сессий
   * пользователя в ней, 401 (возможная кража токена).
   */
  async rotate(refreshToken: string): Promise<TokenPair> {
    const hash = sha256(refreshToken);
    const session = await this.prisma.session.findUnique({
      where: { refreshHash: hash },
      include: { user: true },
    });

    if (!session) {
      throw new ApiError(401, 'AUTH_REFRESH_INVALID', 'Сессия не найдена');
    }

    if (session.revokedAt !== null) {
      // Reuse detection: токен уже отозван → семья скомпрометирована.
      await this.prisma.session.updateMany({
        where: { family: session.family, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new ApiError(
        401,
        'AUTH_REFRESH_INVALID',
        'Сессия отозвана: повторное использование refresh-токена',
      );
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      throw new ApiError(401, 'AUTH_REFRESH_INVALID', 'Сессия истекла');
    }

    const env = loadEnv();
    const nextRefresh = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + env.REFRESH_TTL_SEC * 1000);

    // Атомарно: старая запись отзывается, новая создаётся в семье.
    await this.prisma.$transaction([
      this.prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      }),
      this.prisma.session.create({
        data: {
          userId: session.userId,
          refreshHash: sha256(nextRefresh),
          family: session.family,
          expiresAt,
          userAgent: session.userAgent,
          ip: session.ip,
        },
      }),
    ]);

    return {
      accessToken: this.issueAccessToken(session.userId),
      refreshToken: nextRefresh,
    };
  }

  /** Отзыв сессии по refresh-токену (logout). Идемпотентен. */
  async revoke(refreshToken: string): Promise<void> {
    const hash = sha256(refreshToken);
    await this.prisma.session.updateMany({
      where: { refreshHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Отзыв всех сессий пользователя (сброс пароля). */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Сессия для аудита/тестов. */
  async findSession(refreshToken: string): Promise<Session | null> {
    return this.prisma.session.findUnique({
      where: { refreshHash: sha256(refreshToken) },
    });
  }
}
