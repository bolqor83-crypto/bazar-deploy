/**
 * Декоратор @CurrentUser(): id аутентифицированного пользователя.
 *
 * JwtStrategy валидирует access-JWT и кладёт в request.user
 * { userId }. Контроллеры не разбирают токен сами.
 */
import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  userId: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);
