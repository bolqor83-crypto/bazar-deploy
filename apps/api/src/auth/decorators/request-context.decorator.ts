/**
 * Декоратор @ReqContext(): контекст устройства для аудита сессии.
 *
 * IP (с учётом прокси preview-шлюза) и User-Agent сохраняются в
 * записи сессии refresh-токена.
 */
import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

export interface RequestContext {
  userAgent?: string;
  ip?: string;
}

export const ReqContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestContext => {
    const req = ctx.switchToHttp().getRequest<{
      headers: Record<string, unknown>;
      connection?: { remoteAddress?: string };
      socket?: { remoteAddress?: string };
    }>();
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0]?.trim()
        : (req.socket?.remoteAddress ??
          req.connection?.remoteAddress ??
          undefined);
    const userAgent =
      typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent']
        : undefined;
    return { ip, userAgent };
  },
);
