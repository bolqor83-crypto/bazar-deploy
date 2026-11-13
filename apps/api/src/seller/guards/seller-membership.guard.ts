/**
 * Guard членства WHOLESALE_SELLER (Промт 10, Часть B).
 *
 * Активная организация передаётся заголовком X-Organization-Id.
 * Guard проверяет membership (userId, organizationId, WHOLESALE_SELLER)
 * и кладёт контекст продавца в request для сервисов.
 */
import {
  CanActivate,
  ExecutionContext,
  createParamDecorator,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/filters/api-error';

export interface SellerContext {
  userId: string;
  organizationId: string;
}

export const SELLER_CONTEXT = 'sellerContext';

@Injectable()
export class SellerMembershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: { userId: string };
      headers: Record<string, string | string[] | undefined>;
      [SELLER_CONTEXT]?: SellerContext;
    }>();
    const userId = request.user?.userId;
    if (!userId) {
      throw new ApiError(401, 'AUTH_UNAUTHORIZED', 'Требуется вход');
    }
    const header = request.headers['x-organization-id'];
    const organizationId = Array.isArray(header) ? header[0] : header;
    if (!organizationId) {
      throw new ApiError(
        400,
        'SELLER_NO_ORGANIZATION',
        'Не выбрана организация продавца',
      );
    }
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        organizationId,
        role: 'WHOLESALE_SELLER',
      },
      select: { id: true },
    });
    if (!membership) {
      throw new ApiError(
        403,
        'SELLER_FORBIDDEN',
        'Нет прав продавца в этой организации',
      );
    }
    request[SELLER_CONTEXT] = { userId, organizationId };
    return true;
  }
}

/** Контекст продавца (userId + organizationId после guard). */
export const CurrentSeller = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SellerContext => {
    return ctx.switchToHttp().getRequest()[SELLER_CONTEXT];
  },
);
